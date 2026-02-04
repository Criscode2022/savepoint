import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, firstValueFrom, from } from "rxjs";
import { environment } from "../../environments/environment";

export interface QueryOptions {
  select?: string;
  filters?: Record<string, string | number | boolean | null | undefined>;
  order?: string;
  limit?: number;
  offset?: number;
}

@Injectable({
  providedIn: "root",
})
export class DatabaseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.databaseUrl.replace(/\/+$/, "");
  private readonly schema = "public";

  private getHeaders(options?: { write?: boolean }): HttpHeaders {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Accept-Profile": this.schema,
    };

    if (options?.write) {
      headers["Content-Profile"] = this.schema;
      headers["Prefer"] = "return=representation";
      headers["Content-Type"] = "application/json";
    }

    return new HttpHeaders(headers);
  }

  private buildParams(options?: QueryOptions): HttpParams {
    let params = new HttpParams();

    if (options?.select) {
      params = params.set("select", options.select);
    }

    if (options?.order) {
      params = params.set("order", options.order);
    }

    if (typeof options?.limit === "number") {
      params = params.set("limit", String(options.limit));
    }

    if (typeof options?.offset === "number") {
      params = params.set("offset", String(options.offset));
    }

    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (value === undefined) {
          continue;
        }
        if (value === null) {
          params = params.set(key, "is.null");
        } else {
          // Allow callers to pass raw PostgREST filter operators.
          // Examples: 'not.is.null', 'is.null', 'not.eq.10', 'ilike.*foo*', 'in.(a,b)'
          if (
            typeof value === "string" &&
            /^(not\.)?(eq|neq|gt|gte|lt|lte|like|ilike|is|in|cs|cd|ov|sl|sr|nxr|nxl|adj)\./.test(
              value,
            )
          ) {
            params = params.set(key, value);
          } else {
            params = params.set(key, `eq.${String(value)}`);
          }
        }
      }
    }

    return params;
  }

  /**
   * Select rows from a table
   */
  select<T>(table: string, options?: QueryOptions): Observable<T[]> {
    const url = `${this.baseUrl}/${table}`;
    return from(
      firstValueFrom(
        this.http.get<T[]>(url, {
          params: this.buildParams(options),
          headers: this.getHeaders(),
        }),
      ),
    );
  }

  /**
   * Select a single row by ID
   */
  selectOne<T>(
    table: string,
    id: string,
    options?: { select?: string; idColumn?: string },
  ): Observable<T | undefined> {
    const idColumn = options?.idColumn || "id";
    return from(
      firstValueFrom(
        this.select<T>(table, {
          ...options,
          filters: { [idColumn]: id },
          limit: 1,
        }),
      ).then((rows) => rows[0]),
    );
  }

  /**
   * Insert a row and return the created row
   */
  insert<T>(table: string, data: Record<string, unknown>): Observable<T> {
    const url = `${this.baseUrl}/${table}`;
    return from(
      firstValueFrom(
        this.http.post<T[]>(url, data, {
          headers: this.getHeaders({ write: true }),
        }),
      ).then((rows) => {
        if (!rows?.[0]) {
          throw new Error("Insert failed: no row returned");
        }
        return rows[0];
      }),
    );
  }

  /**
   * Update rows by filter
   */
  update<T>(
    table: string,
    filters: Record<string, string | number | boolean | null | undefined>,
    data: Record<string, unknown>,
  ): Observable<T[]> {
    const url = `${this.baseUrl}/${table}`;
    return from(
      firstValueFrom(
        this.http.patch<T[]>(url, data, {
          params: this.buildParams({ filters }),
          headers: this.getHeaders({ write: true }),
        }),
      ),
    );
  }

  /**
   * Update a single row by ID
   */
  updateById<T>(
    table: string,
    id: string,
    data: Record<string, unknown>,
    idColumn: string = "id",
  ): Observable<T | undefined> {
    return from(
      firstValueFrom(this.update<T>(table, { [idColumn]: id }, data)).then(
        (rows) => rows?.[0],
      ),
    );
  }

  /**
   * Delete rows by filter
   */
  delete(
    table: string,
    filters: Record<string, string | number | boolean | null | undefined>,
  ): Observable<number> {
    const url = `${this.baseUrl}/${table}`;
    return from(
      firstValueFrom(
        this.http.delete<unknown[]>(url, {
          params: this.buildParams({ filters }),
          headers: this.getHeaders({ write: true }),
        }),
      ).then((rows) => (Array.isArray(rows) ? rows.length : 0)),
    );
  }

  /**
   * Delete a single row by ID
   */
  deleteById(
    table: string,
    id: string,
    idColumn: string = "id",
  ): Observable<boolean> {
    return from(
      firstValueFrom(this.delete(table, { [idColumn]: id })).then(
        (count) => count > 0,
      ),
    );
  }
}
