class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message)  // "super()" means calling a constructor of your parent class 
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.errors = errors

        if (stack) {
            this.stack = stack
        } else {
          Error.captureStackTrace(this, this.constructor); // "Error.captureStackTrace" is called to generate a stack trace automatically
        }
    }
}

export { ApiError }