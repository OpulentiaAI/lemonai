const router = require("koa-router")();
const Joi = require('joi');

const Model = require('@src/models/Model');
const Platform = require('@src/models/Platform');
const { Op, sequelize } = require("sequelize");

// Input validation schemas
const createModelSchema = Joi.object({
  platform_id: Joi.number().integer().positive().required(),
  model_id: Joi.string().trim().min(1).max(255).required(),
  model_name: Joi.string().trim().min(1).max(255).required(),
  group_name: Joi.string().trim().min(1).max(255).required(),
  model_types: Joi.array().items(Joi.string()).optional()
});

const updateModelSchema = Joi.object({
  model_name: Joi.string().trim().min(1).max(255).optional(),
  group_name: Joi.string().trim().min(1).max(255).optional(),
  model_types: Joi.array().items(Joi.string()).optional()
}).min(1);

const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

const platformIdParamSchema = Joi.object({
  platform_id: Joi.number().integer().positive().required()
});

// Utility functions for error handling and logging
const logError = (ctx, error, operation) => {
  const requestId = ctx.state.requestId || Math.random().toString(36).substr(2, 9);
  console.error(`[${new Date().toISOString()}] [${requestId}] Error in ${operation}:`, {
    error: error.message,
    stack: error.stack,
    url: ctx.url,
    method: ctx.method,
    body: ctx.request.body,
    params: ctx.params,
    userAgent: ctx.get('User-Agent'),
    ip: ctx.ip
  });
};

const handleValidationError = (error, response) => {
  const details = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message
  }));
  return response.fail({ validation_errors: details }, "Validation failed", 400);
};

const handleDatabaseError = (error, response, operation) => {
  if (error.name === 'SequelizeValidationError') {
    const details = error.errors.map(err => ({
      field: err.path,
      message: err.message
    }));
    return response.fail({ validation_errors: details }, "Database validation failed", 400);
  }
  
  if (error.name === 'SequelizeUniqueConstraintError') {
    return response.fail({}, "Resource already exists", 409);
  }
  
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return response.fail({}, "Referenced resource not found", 400);
  }
  
  if (error.name === 'SequelizeConnectionError') {
    return response.fail({}, "Database connection error", 503);
  }
  
  console.error(`Database error in ${operation}:`, error);
  return response.fail({}, "Internal server error", 500);
};
// Create a new model
/**
 * @swagger
 * /api/model:
 *   post:
 *     summary: Create a new model
 *     tags:  
 *       - Model
 *     description: This endpoint creates a new model with the provided content.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platform_id:
 *                 type: string
 *                 description: Platform ID
 *               model_id:
 *                 type: string
 *                 description: model id
 *               model_name:
 *                 type: string
 *                 description: model name
 *               group_name:
 *                 type: string
 *                 description: group name
 *               model_types:
 *                 type: array
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
 *                   $ref: './schemas/model.json'
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 *                 
 */
router.post("/", async(ctx) => {
  const { request, response } = ctx;
  
  try {
    // Input validation
    const { error, value } = createModelSchema.validate(request.body || {});
    if (error) {
      return handleValidationError(error, response);
    }

    const { platform_id, model_id, model_name, group_name, model_types } = value;

    // Start transaction for multi-step operation
    const transaction = await sequelize.transaction();
    
    try {
      // Verify platform exists and is accessible
      const platform = await Platform.findByPk(platform_id, { transaction });
      if (!platform) {
        await transaction.rollback();
        return response.fail({}, "Platform not found", 404);
      }

      // Check for existing model
      const existingModel = await Model.findOne({ 
        where: { model_id, platform_id },
        transaction
      });
      
      if (existingModel) {
        await transaction.rollback();
        return response.fail({}, "Model ID already exists for this platform", 409);
      }

      // Create the model
      const model = await Model.create({
        platform_id,
        model_id,
        model_name,
        group_name,
        model_types: model_types || []
      }, { transaction });

      await transaction.commit();

      // Log successful creation
      console.log(`[${new Date().toISOString()}] Model created successfully:`, {
        modelId: model.id,
        platformId: platform_id,
        modelName: model_name
      });

      return response.success(model, "Model created successfully", 201);
      
    } catch (dbError) {
      await transaction.rollback();
      throw dbError;
    }
    
  } catch (error) {
    logError(ctx, error, 'POST /model');
    return handleDatabaseError(error, response, 'create model');
  }
});

// Get model list by platform id
/**
 * @swagger
 * /api/model/platform/{platform_id}:
 *   get:
 *     summary: Get model list by platform id
 *     tags:  
 *       - Model
 *     description: This endpoint retrieves a list of models by platform id.
 *     parameters:
 *       - in: path
 *         name: platform_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the platform
 *     responses:
 *       200:
 *         description: Successfully retrieved model list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: './schemas/model.json'
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 *                 
 */
router.get("/list/:platform_id", async (ctx) => {
  const { params, response } = ctx;
  
  try {
    // Validate platform_id parameter
    const { error, value } = platformIdParamSchema.validate(params);
    if (error) {
      return handleValidationError(error, response);
    }

    const { platform_id } = value;

    // Verify platform exists
    const platform = await Platform.findByPk(platform_id);
    if (!platform) {
      return response.fail({}, "Platform not found", 404);
    }

    // Get models for the platform
    const models = await Model.findAll({
      where: { platform_id },
      order: [['group_name', 'ASC'], ['model_name', 'ASC']]
    });

    // Validate response data
    const validatedModels = models.map(model => ({
      id: model.id,
      platform_id: model.platform_id,
      model_id: model.model_id,
      model_name: model.model_name,
      group_name: model.group_name,
      model_types: model.model_types || [],
      logo_url: model.logo_url,
      create_at: model.create_at,
      update_at: model.update_at
    }));

    return response.success(validatedModels, "Models retrieved successfully");
    
  } catch (error) {
    logError(ctx, error, 'GET /model/list/:platform_id');
    return handleDatabaseError(error, response, 'get models by platform');
  }
});

// update model
/**
 * @swagger
 * /api/model/{id}:
 *   put:
 *     summary: Update model
 *     tags:  
 *       - Model
 *     description: This endpoint updates a specified model.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the model to be updated
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               model_name:
 *                 type: string
 *                 description: Model name
 *               group_name:
 *                 type: string
 *                 description: Group name
 *               model_types:
 *                 type: array
 *
 *
 */

router.put("/:id", async (ctx) => {
  const { params, request, response } = ctx;
  
  try {
    // Validate ID parameter
    const { error: paramError, value: paramValue } = idParamSchema.validate(params);
    if (paramError) {
      return handleValidationError(paramError, response);
    }

    // Validate request body
    const { error: bodyError, value: bodyValue } = updateModelSchema.validate(request.body || {});
    if (bodyError) {
      return handleValidationError(bodyError, response);
    }

    const { id } = paramValue;
    const updateData = bodyValue;

    // Start transaction
    const transaction = await sequelize.transaction();
    
    try {
      // Check if model exists
      const existingModel = await Model.findByPk(id, { transaction });
      if (!existingModel) {
        await transaction.rollback();
        return response.fail({}, "Model not found", 404);
      }

      // Update the model
      const [affectedRows] = await Model.update(
        {
          ...updateData,
          update_at: new Date()
        },
        {
          where: { id },
          transaction
        }
      );

      if (affectedRows === 0) {
        await transaction.rollback();
        return response.fail({}, "Model not found or no changes made", 404);
      }

      // Get updated model
      const updatedModel = await Model.findByPk(id, { transaction });
      
      await transaction.commit();

      // Log successful update
      console.log(`[${new Date().toISOString()}] Model updated successfully:`, {
        modelId: id,
        changes: updateData
      });

      return response.success(updatedModel, "Model updated successfully");
      
    } catch (dbError) {
      await transaction.rollback();
      throw dbError;
    }
    
  } catch (error) {
    logError(ctx, error, 'PUT /model/:id');
    return handleDatabaseError(error, response, 'update model');
  }
});

// Delete model
/**
 * @swagger
 * /api/model/{id}:
 *   delete:
 *     summary: Delete model
 *     tags:  
 *       - Model
 *     description: This endpoint deletes a specified model.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the model to be deleted
 *     responses:
 *       200:
 *         description: Model deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: './schemas/model.json'
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 */
router.delete("/:id", async (ctx) => {
  const { params, response } = ctx;
  
  try {
    // Validate ID parameter
    const { error, value } = idParamSchema.validate(params);
    if (error) {
      return handleValidationError(error, response);
    }

    const { id } = value;

    // Start transaction
    const transaction = await sequelize.transaction();
    
    try {
      // Check if model exists
      const existingModel = await Model.findByPk(id, { transaction });
      if (!existingModel) {
        await transaction.rollback();
        return response.fail({}, "Model not found", 404);
      }

      // Delete the model
      const deletedRows = await Model.destroy({
        where: { id },
        transaction
      });

      if (deletedRows === 0) {
        await transaction.rollback();
        return response.fail({}, "Model not found", 404);
      }

      await transaction.commit();

      // Log successful deletion
      console.log(`[${new Date().toISOString()}] Model deleted successfully:`, {
        modelId: id,
        modelName: existingModel.model_name
      });

      return response.success({ deleted_id: id }, "Model deleted successfully");
      
    } catch (dbError) {
      await transaction.rollback();
      throw dbError;
    }
    
  } catch (error) {
    logError(ctx, error, 'DELETE /model/:id');
    return handleDatabaseError(error, response, 'delete model');
  }
});

// get model list where platform is enabled
/**
 * @swagger
 * /api/model/enabled:
 *   get:
 *     summary: Get model list where platform is enabled
 *     tags:  
 *       - Model
 *     description: This endpoint retrieves a list of models where the platform is enabled.
 *     responses:
 *       200:
 *         description: Successfully retrieved model list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: './schemas/model_enable.json'
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 */
router.get("/enabled", async (ctx) => {
  const { response } = ctx;
  
  try {
    // Get enabled platforms with transaction for consistency
    const transaction = await sequelize.transaction();
    
    try {
      const platforms = await Platform.findAll({
        where: {
          [Op.or]: [
            { is_enabled: true },
            { is_subscribe: true }
          ]
        },
        order: [['name', 'ASC']],
        transaction
      });

      if (platforms.length === 0) {
        await transaction.commit();
        return response.success([], "No enabled platforms found");
      }

      // Get all models for enabled platforms in a single query for better performance
      const platformIds = platforms.map(p => p.id);
      const models = await Model.findAll({
        where: {
          platform_id: {
            [Op.in]: platformIds
          }
        },
        order: [['group_name', 'ASC'], ['model_name', 'ASC']],
        transaction
      });

      // Create platform lookup map for better performance
      const platformMap = new Map();
      platforms.forEach(platform => {
        platformMap.set(platform.id, {
          name: platform.name,
          is_subscribe: platform.is_subscribe,
          logo_url: platform.logo_url
        });
      });

      // Build response with validated data
      const allModels = models.map(model => {
        const platform = platformMap.get(model.platform_id);
        if (!platform) {
          throw new Error(`Platform not found for model ${model.id}`);
        }

        return {
          id: model.id,
          platform_id: model.platform_id,
          model_id: model.model_id,
          model_name: model.model_name,
          group_name: model.group_name,
          model_types: model.model_types || [],
          logo_url: model.logo_url,
          platform_name: platform.name,
          is_subscribe: platform.is_subscribe,
          platform_logo_url: platform.logo_url,
          create_at: model.create_at,
          update_at: model.update_at
        };
      });

      await transaction.commit();

      // Log successful retrieval
      console.log(`[${new Date().toISOString()}] Enabled models retrieved:`, {
        platformCount: platforms.length,
        modelCount: allModels.length
      });

      return response.success(allModels, "Enabled models retrieved successfully");
      
    } catch (dbError) {
      await transaction.rollback();
      throw dbError;
    }
    
  } catch (error) {
    logError(ctx, error, 'GET /model/enabled');
    return handleDatabaseError(error, response, 'get enabled models');
  }
});

module.exports = exports = router.routes();
