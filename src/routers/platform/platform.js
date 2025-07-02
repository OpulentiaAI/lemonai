const router = require("koa-router")();
const Joi = require("joi");
const { v4: uuidv4 } = require("uuid");

const Platform = require("@src/models/Platform");
const Model = require("@src/models/Model");
const checkLlmApiAvailability = require("@src/utils/check_llm_api_availability");

// Validation schemas
const createPlatformSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Platform name is required',
    'string.max': 'Platform name must not exceed 255 characters'
  }),
  logo_url: Joi.string().uri().max(255).optional().allow('').messages({
    'string.uri': 'Logo URL must be a valid URL',
    'string.max': 'Logo URL must not exceed 255 characters'
  }),
  source_type: Joi.string().valid('system', 'user', 'custom').default('user').messages({
    'any.only': 'Source type must be one of: system, user, custom'
  })
});

const updatePlatformSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional().messages({
    'string.empty': 'Platform name cannot be empty',
    'string.max': 'Platform name must not exceed 255 characters'
  }),
  api_key: Joi.string().max(255).optional().allow('').messages({
    'string.max': 'API key must not exceed 255 characters'
  }),
  api_url: Joi.string().uri().max(255).optional().allow('').messages({
    'string.uri': 'API URL must be a valid URL',
    'string.max': 'API URL must not exceed 255 characters'
  }),
  is_enabled: Joi.boolean().optional(),
  logo_url: Joi.string().uri().max(255).optional().allow('').messages({
    'string.uri': 'Logo URL must be a valid URL',
    'string.max': 'Logo URL must not exceed 255 characters'
  })
});

const checkApiSchema = Joi.object({
  base_url: Joi.string().uri().required().messages({
    'string.empty': 'Base URL is required',
    'string.uri': 'Base URL must be a valid URL'
  }),
  api_key: Joi.string().optional().allow('').default(''),
  model: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Model is required'
  })
});

// Utility functions
function generateRequestId() {
  return uuidv4();
}

function logError(requestId, operation, error, context = {}) {
  console.error(`[${new Date().toISOString()}] [${requestId}] ${operation} failed:`, {
    error: error.message,
    stack: error.stack,
    context
  });
}

function logInfo(requestId, operation, data = {}) {
  console.log(`[${new Date().toISOString()}] [${requestId}] ${operation}:`, data);
}

function validateInput(schema, data, requestId) {
  const { error, value } = schema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
  
  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    logError(requestId, 'Input validation', new Error('Validation failed'), {
      errors: validationErrors,
      input: data
    });
    
    throw {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Input validation failed',
      details: validationErrors
    };
  }
  
  return value;
}

async function handleDatabaseOperation(requestId, operation, dbOperation) {
  try {
    const result = await dbOperation();
    logInfo(requestId, `${operation} completed successfully`);
    return result;
  } catch (error) {
    logError(requestId, operation, error);
    
    if (error.name === 'SequelizeValidationError') {
      throw {
        status: 400,
        code: 'DATABASE_VALIDATION_ERROR',
        message: 'Database validation failed',
        details: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      };
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw {
        status: 409,
        code: 'DUPLICATE_ENTRY',
        message: 'A platform with this information already exists',
        details: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      };
    }
    
    if (error.name === 'SequelizeDatabaseError') {
      throw {
        status: 500,
        code: 'DATABASE_ERROR',
        message: 'Database operation failed'
      };
    }
    
    throw {
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    };
  }
}

// Create a new platform
/**
 * @swagger
 * /api/platform:
 *   post:
 *     summary: Create a new platform
 *     tags:  
 *       - Platform
 *     description: This endpoint creates a new platform with the provided content.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Platform name
 *               logo_url:
 *                 type: string
 *                 description: Logo URL
 *               source_type:
 *                 type: string
 *                 description: Source type
 * 
 *     responses:
 *       200:
 *         description: Successfully created a new platform
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: './schemas/platform.json'
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 *                 
 */
router.post("/", async ({ request, response }) => {
  const requestId = generateRequestId();
  
  try {
    logInfo(requestId, 'Create platform request started', {
      body: request.body,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    const body = request.body || {};
    const validatedData = validateInput(createPlatformSchema, body, requestId);

    const platform = await handleDatabaseOperation(
      requestId,
      'Create platform',
      async () => {
        return await Platform.create({
          name: validatedData.name,
          logo_url: validatedData.logo_url || null,
          source_type: validatedData.source_type,
        });
      }
    );

    logInfo(requestId, 'Platform created successfully', { platformId: platform.id });
    
    response.status = 201;
    return response.success(platform, 'Platform created successfully');
    
  } catch (error) {
    if (error.status) {
      response.status = error.status;
      return response.fail(error.details || {}, error.message, error.code);
    }
    
    logError(requestId, 'Create platform', error);
    response.status = 500;
    return response.fail({}, 'Internal server error', 'INTERNAL_ERROR');
  }
});

// Get platform list
/**
 * @swagger
 * /api/platform:
 *   get:
 *     summary: Get platform list
 *     tags:  
 *       - Platform
 *     description: This endpoint retrieves the list of platforms.
 *     responses:
 *       200:
 *         description: Successfully retrieved the platform list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: './schemas/platform.json'
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 */
router.get("/", async ({ request, response }) => {
  const requestId = generateRequestId();
  
  try {
    logInfo(requestId, 'Get platforms request started', {
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    const platforms = await handleDatabaseOperation(
      requestId,
      'Fetch platforms',
      async () => {
        return await Platform.findAll({ 
          order: [['create_at', 'DESC']],
          attributes: { exclude: ['api_key'] } // Don't expose API keys in list
        });
      }
    );

    logInfo(requestId, 'Platforms fetched successfully', { count: platforms.length });
    return response.success(platforms, 'Platforms retrieved successfully');
    
  } catch (error) {
    if (error.status) {
      response.status = error.status;
      return response.fail(error.details || {}, error.message, error.code);
    }
    
    logError(requestId, 'Get platforms', error);
    response.status = 500;
    return response.fail({}, 'Internal server error', 'INTERNAL_ERROR');
  }
});

// update platform
/**
 * @swagger
 * /api/platform/{platform_id}:
 *   put:
 *     summary: Update platform
 *     tags:  
 *       - Platform
 *     description: This endpoint updates the platform with the provided platform_id.
 *     parameters:
 *       - name: platform_id
 *         in: path
 *         required: true
 *         description: Unique identifier for the platform
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: Platform api key
 *               api_url:
 *                 type: string
 *                 description: Platform api url
 *               name:
 *                 type: string
 *                 description: Platform name
 *               is_enabled:
 *                 type: boolean
 *                 description: Is platform enabled
 *
 *
 */
router.put("/:platform_id", async ({ params, request, response }) => {
  const requestId = generateRequestId();
  
  try {
    const { platform_id } = params;
    
    // Validate platform_id
    if (!platform_id || isNaN(parseInt(platform_id))) {
      response.status = 400;
      return response.fail({}, 'Invalid platform ID', 'INVALID_PLATFORM_ID');
    }

    logInfo(requestId, 'Update platform request started', {
      platformId: platform_id,
      body: request.body,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    const body = request.body || {};
    const validatedData = validateInput(updatePlatformSchema, body, requestId);

    const platform = await handleDatabaseOperation(
      requestId,
      'Find platform for update',
      async () => {
        return await Platform.findOne({
          where: { id: platform_id }
        });
      }
    );

    if (!platform) {
      response.status = 404;
      return response.fail({}, "Platform does not exist", 'PLATFORM_NOT_FOUND');
    }

    // Check if trying to modify system platform inappropriately
    if (platform.source_type === 'system' && validatedData.source_type && validatedData.source_type !== 'system') {
      response.status = 403;
      return response.fail({}, "Cannot change source type of system platform", 'FORBIDDEN_OPERATION');
    }

    const updatedPlatform = await handleDatabaseOperation(
      requestId,
      'Update platform',
      async () => {
        // Only update fields that were provided
        const updateData = {};
        Object.keys(validatedData).forEach(key => {
          if (validatedData[key] !== undefined) {
            updateData[key] = validatedData[key];
          }
        });
        
        updateData.update_at = new Date();
        
        await platform.update(updateData);
        return platform;
      }
    );

    logInfo(requestId, 'Platform updated successfully', { 
      platformId: platform_id,
      updatedFields: Object.keys(validatedData)
    });
    
    return response.success(updatedPlatform, 'Platform updated successfully');
    
  } catch (error) {
    if (error.status) {
      response.status = error.status;
      return response.fail(error.details || {}, error.message, error.code);
    }
    
    logError(requestId, 'Update platform', error, { platformId: params.platform_id });
    response.status = 500;
    return response.fail({}, 'Internal server error', 'INTERNAL_ERROR');
  }
});

// delete platform
/**
 * @swagger
 * /api/platform/{platform_id}:
 *   delete:
 *     summary: Delete platform
 *     tags:  
 *       - Platform
 *     description: This endpoint deletes the platform with the provided platform_id.
 *     parameters:
 *       - name: platform_id
 *         in: path
 *         required: true
 *         description: Unique identifier for the platform
 *         schema:
 *           type: string
 */
router.delete("/:platform_id", async ({ params, request, response }) => {
  const requestId = generateRequestId();
  const sequelize = Platform.sequelize;
  
  try {
    const { platform_id } = params;
    
    // Validate platform_id
    if (!platform_id || isNaN(parseInt(platform_id))) {
      response.status = 400;
      return response.fail({}, 'Invalid platform ID', 'INVALID_PLATFORM_ID');
    }

    logInfo(requestId, 'Delete platform request started', {
      platformId: platform_id,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    const platform = await handleDatabaseOperation(
      requestId,
      'Find platform for deletion',
      async () => {
        return await Platform.findOne({
          where: { id: platform_id }
        });
      }
    );

    if (!platform) {
      response.status = 404;
      return response.fail({}, "Platform does not exist", 'PLATFORM_NOT_FOUND');
    }

    if (platform.source_type === "system") {
      response.status = 403;
      return response.fail({}, "System platform cannot be deleted", 'FORBIDDEN_OPERATION');
    }

    // Use transaction for multi-table operation
    await handleDatabaseOperation(
      requestId,
      'Delete platform and related models',
      async () => {
        return await sequelize.transaction(async (transaction) => {
          // First, delete all models associated with this platform
          const deletedModelsCount = await Model.destroy({
            where: { platform_id: platform_id },
            transaction
          });
          
          logInfo(requestId, 'Associated models deleted', { count: deletedModelsCount });
          
          // Then delete the platform
          await platform.destroy({ transaction });
          
          return { deletedModelsCount };
        });
      }
    );

    logInfo(requestId, 'Platform deleted successfully', { platformId: platform_id });
    
    return response.success({}, 'Platform and associated models deleted successfully');
    
  } catch (error) {
    if (error.status) {
      response.status = error.status;
      return response.fail(error.details || {}, error.message, error.code);
    }
    
    logError(requestId, 'Delete platform', error, { platformId: params.platform_id });
    response.status = 500;
    return response.fail({}, 'Internal server error', 'INTERNAL_ERROR');
  }
});

/**
 * @swagger
 * /api/platform/check_api_availability:
 *   post:
 *     summary: Check API availability
 *     tags:  
 *       - Platform
 *     description: This endpoint checks the availability of the API.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               base_url:
 *                 type: string
 *                 description: Base URL
 *               api_key:
 *                 type: string
 *                 description: API key
 *               model:
 *                 type: string
 *                 description: Model
 *     responses:
 *       200:
 *         description: Successfully checked the API availability
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: boolean
 *                       description: Status
 *                     message:
 *                       type: string
 *                       description: Message
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 */
router.post("/check_api_availability", async ({ request, response }) => {
  const requestId = generateRequestId();
  
  try {
    logInfo(requestId, 'Check API availability request started', {
      body: { ...request.body, api_key: request.body?.api_key ? '[REDACTED]' : undefined },
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    const body = request.body || {};
    const validatedData = validateInput(checkApiSchema, body, requestId);

    const result = await handleDatabaseOperation(
      requestId,
      'Check LLM API availability',
      async () => {
        const startTime = Date.now();
        const apiResult = await checkLlmApiAvailability(
          validatedData.base_url, 
          validatedData.api_key, 
          validatedData.model
        );
        const duration = Date.now() - startTime;
        
        logInfo(requestId, 'API availability check completed', {
          status: apiResult.status,
          duration: `${duration}ms`,
          baseUrl: validatedData.base_url,
          model: validatedData.model
        });
        
        return apiResult;
      }
    );

    // Validate the response from checkLlmApiAvailability
    if (!result || typeof result.status !== 'boolean' || typeof result.message !== 'string') {
      throw new Error('Invalid response from API availability check');
    }

    return response.success(result, 'API availability check completed');
    
  } catch (error) {
    if (error.status) {
      response.status = error.status;
      return response.fail(error.details || {}, error.message, error.code);
    }
    
    logError(requestId, 'Check API availability', error);
    response.status = 500;
    return response.fail({}, 'API availability check failed', 'API_CHECK_ERROR');
  }
});

module.exports = exports = router.routes();
