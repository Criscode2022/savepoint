import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = error.error.message;
      } else {
        // Server-side error
        switch (error.status) {
          case 400:
            errorMessage = error.error?.message || 'Bad request';
            break;
          case 401:
            errorMessage = 'Unauthorized. Please log in again.';
            break;
          case 403:
            errorMessage = 'Access denied';
            break;
          case 404:
            errorMessage = 'Resource not found';
            break;
          case 409:
            errorMessage = error.error?.message || 'Conflict occurred';
            break;
          case 422:
            errorMessage = error.error?.message || 'Validation failed';
            break;
          case 429:
            errorMessage = 'Too many requests. Please try again later.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
          case 503:
            errorMessage = 'Service unavailable. Please try again later.';
            break;
          default:
            errorMessage = error.error?.message || `Error ${error.status}: ${error.statusText}`;
        }
      }

      console.error('HTTP Error:', error);
      
      // Return error with formatted message
      const enhancedError = new Error(errorMessage);
      (enhancedError as any).status = error.status;
      (enhancedError as any).originalError = error;
      
      return throwError(() => enhancedError);
    })
  );
};