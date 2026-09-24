// Greska sa HTTP statusom; errorHandler je pretvara u ApiResponse.
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export const BadRequest = (m: string) => new ApiError(400, m);
export const Unauthorized = (m: string) => new ApiError(401, m);
export const Forbidden = (m: string) => new ApiError(403, m);
export const NotFound = (m: string) => new ApiError(404, m);
export const Conflict = (m: string) => new ApiError(409, m);
