### Front End Configuration File

Front-end configuration files are located infrontend/.envUnder the document. You can referfrontend/.env.exampleFile to learn about the available configuration items and their examples.

#### Configuration Item Description

* **VITE\_SERVICE\_URL**
  * Description: Defines the start address and port of the backend service.
  * Default:http://127.0.0.1:3000
  * Example:

VITE\_SERVICE\_URL=http://127.0.0.1:3000\


*
  * Note: Modify the endpoint and port of the backend service.
* **VITE\_PORT**
  * Description: Defines the port number of the front-end application.
  * Default:5005
  * Example:

VITE\_PORT=5005\


*
  * Description: After the front end is started, you can passhttp://localhost:5005Access the Lemon app.

### New Frontend Features
- Loading and error states for a better user experience.
- Custom error classes for improved error handling.
- Circuit breaker to prevent repeated failures.
- Notification rate limiting to avoid spamming the user.
- Request correlation IDs for easier debugging.
