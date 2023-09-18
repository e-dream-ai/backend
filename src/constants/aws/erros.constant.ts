/**
 * Base exception classses for all service exceptions from CognitoIdentityProvider service. Exceptions names with CognitoIPSExceptions constant
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-cognito-identity-provider/classes/cognitoidentityproviderserviceexception.html
 *
 */

export const CognitoIPSExceptions = {
  INTERNAL_ERROR_EXCEPTION: "InternalErrorException",
  INVALID_PARAMETER_EXCEPTION: "InvalidParameterException",
  NOT_AUTHORIZED_EXCEPTION: "NotAuthorizedException",
  RESOURCE_NOT_FOUND_EXCEPTION: "ResourceNotFoundException",
  TOO_MANY_REQUESTS_EXCEPTION: "TooManyRequestsException",
  USER_IMPORT_IN_PROGRESS_EXCEPTION: "UserImportInProgressException",
  USER_NOT_FOUND_EXCEPTION: "UserNotFoundException",
  INVALID_LAMBDA_RESPONSE_EXCEPTION: "InvalidLambdaResponseException",
  LIMIT_EXCEEDED_EXCEPTION: "LimitExceededException",
  TOO_MANY_FAILED_ATTEMPTS_EXCEPTION: "TooManyFailedAttemptsException",
  UNEXPECTED_LAMBDA_EXCEPTION: "UnexpectedLambdaException",
  USER_LAMBDA_VALIDATION_EXCEPTION: "UserLambdaValidationException",
  CODE_DELIVERY_FAILURE_EXCEPTION: "CodeDeliveryFailureException",
  INVALID_PASSWORD_EXCEPTION: "InvalidPasswordException",
  INVALID_SMS_ROLE_ACCESS_POLICY_EXCEPTION:
    "InvalidSmsRoleAccessPolicyException",
  INVALID_SMS_ROLE_TRUST_RELATIONSHIP_EXCEPTION:
    "InvalidSmsRoleTrustRelationshipException",
  PRECONDITION_NOT_MET_EXCEPTION: "PreconditionNotMetException",
  UNSUPPORTED_USER_STATE_EXCEPTION: "UnsupportedUserStateException",
  USERNAME_EXISTS_EXCEPTION: "UsernameExistsException",
  ALIAS_EXISTS_EXCEPTION: "AliasExistsException",
  INVALID_USER_POOL_CONFIGURATION_EXCEPTION:
    "InvalidUserPoolConfigurationException",
  MFA_METHOD_NOT_FOUND_EXCEPTION: "MFAMethodNotFoundException",
  PASSWORD_RESET_REQUIRED_EXCEPTION: "PasswordResetRequiredException",
  USER_NOT_CONFIRMED_EXCEPTION: "UserNotConfirmedException",
  USER_POOL_ADD_ON_NOT_ENABLED_EXCEPTION: "UserPoolAddOnNotEnabledException",
  INVALID_EMAIL_ROLE_ACCESS_POLICY_EXCEPTION:
    "InvalidEmailRoleAccessPolicyException",
  CODE_MISMATCH_EXCEPTION: "CodeMismatchException",
  EXPIRED_CODE_EXCEPTION: "ExpiredCodeException",
  SOFTWARE_TOKEN_MFA_NOT_FOUND_EXCEPTION: "SoftwareTokenMFANotFoundException",
  CONCURRENT_MODIFICATION_EXCEPTION: "ConcurrentModificationException",
  FORBIDDEN_EXCEPTION: "ForbiddenException",
  GROUP_EXISTS_EXCEPTION: "GroupExistsException",
  DUPLICATE_PROVIDER_EXCEPTION: "DuplicateProviderException",
  USER_POOL_TAGGING_EXCEPTION: "UserPoolTaggingException",
  INVALID_O_AUTH_FLOW_EXCEPTION: "InvalidOAuthFlowException",
  SCOPE_DOES_NOT_EXIST_EXCEPTION: "ScopeDoesNotExistException",
  UNSUPPORTED_IDENTITY_PROVIDER_EXCEPTION:
    "UnsupportedIdentityProviderException",
  UNAUTHORIZED_EXCEPTION: "UnauthorizedException",
  UNSUPPORTED_OPERATION_EXCEPTION: "UnsupportedOperationException",
  UNSUPPORTED_TOKEN_TYPE_EXCEPTION: "UnsupportedTokenTypeException",
  ENABLE_SOFTWARE_TOKEN_MFA_EXCEPTION: "EnableSoftwareTokenMFAException",
};

export const JWTErrors = {
  JSON_WEB_TOKEN_ERROR: "JsonWebTokenError",
  TOKEN_EXPIRED_ERROR: "TokenExpiredError",
  NOT_BEFORE_ERROR: "NotBeforeError",
};
