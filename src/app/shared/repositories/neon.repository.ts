import { Injectable } from '@angular/core';
import { neon } from '@neondatabase/serverless';
import { environment } from '../../../environments/environment';

export interface QueryOptions {
  select?: string;
  filters?: Record<string, string | number | boolean | null | undefined>;
  order?: string;
  limit?: number;
  offset?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NeonRepository {
  private readonly DATABASE_URL = environment.neonDatabaseUrl;

  private get sql() {
    return neon(this.DATABASE_URL);
  }

  /**
   * Select rows from a table with filtering, ordering, and pagination
   */
  async select<T>(
    table: string,
    options?: QueryOptions
  ): Promise<T[]> {
    const conditions: string[] = [];
    
    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (value === undefined) continue;
        if (value === null) {
          conditions.push(`${key} IS NULL`);
        } else if (typeof value === 'string') {
          conditions.push(`${key} = '${value.replace(/'/g, "''")}'`);
        } else if (typeof value === 'boolean') {
          conditions.push(`${key} = ${value}`);
        } else {
          conditions.push(`${key} = ${value}`);
        }
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    let orderClause = '';
    if (options?.order) {
      // Convert PostgREST-style order to SQL
      // e.g., "created_at.desc" -> "created_at DESC"
      orderClause = `ORDER BY ${options.order.replace('.', ' ')}`;
    }
    
    let limitClause = '';
    if (typeof options?.limit === 'number') {
      limitClause = `LIMIT ${options.limit}`;
    }
    
    let offsetClause = '';
    if (typeof options?.offset === 'number') {
      offsetClause = `OFFSET ${options.offset}`;
    }

    const sql = this.sql;
    const query = `SELECT ${options?.select || '*'} FROM ${table} ${whereClause} ${orderClause} ${limitClause} ${offsetClause}`.trim();
    
    return await sql(query) as T[];
  }

  /**
   * Select a single row by ID
   */
  async selectById<T>(
    table: string,
    id: string,
    options?: { select?: string; idColumn?: string }
  ): Promise<T | undefined> {
    const idColumn = options?.idColumn || 'id';
    const rows = await this.select<T>(table, {
      select: options?.select,
      filters: { [idColumn]: id },
      limit: 1
    });
    return rows[0];
  }

  /**
   * Insert a row and return the created row
   */
  async insert<T>(
    table: string,
    data: Record<string, unknown>
  ): Promise<T> {
    const columns: string[] = [];
    const values: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      
      columns.push(key);
      
      if (value === null) {
        values.push('NULL');
      } else if (typeof value === 'string') {
        values.push(`'${value.replace(/'/g, "''")}'`);
      } else if (typeof value === 'boolean') {
        values.push(value.toString());
      } else if (typeof value === 'number') {
        values.push(value.toString());
      } else if (value instanceof Date) {
        values.push(`'${value.toISOString()}'`);
      } else {
        values.push(`'${JSON.stringify(value).replace(/'/g, "''")}'`);
      }
    }

    const sql = this.sql;
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')}) RETURNING *`;
    
    const rows = await sql(query) as T[];
    if (!rows?.[0]) {
      throw new Error(`Insert failed: no row returned from ${table}`);
    }
    return rows[0];
  }

  /**
   * Update rows by filter and return updated rows
   */
  async update<T>(
    table: string,
    filters: Record<string, string | number | boolean | null | undefined>,
    data: Record<string, unknown>
  ): Promise<T[]> {
    const setClauses: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      
      if (value === null) {
        setClauses.push(`${key} = NULL`);
      } else if (typeof value === 'string') {
        setClauses.push(`${key} = '${value.replace(/'/g, "''")}'`);
      } else if (typeof value === 'boolean') {
        setClauses.push(`${key} = ${value}`);
      } else if (typeof value === 'number') {
        setClauses.push(`${key} = ${value}`);
      } else if (value instanceof Date) {
        setClauses.push(`${key} = '${value.toISOString()}'`);
      } else {
        setClauses.push(`${key} = '${JSON.stringify(value).replace(/'/g, "''")}'`);
      }
    }

    if (setClauses.length === 0) {
      throw new Error('Update failed: no fields to update');
    }

    const conditions: string[] = [];
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined) continue;
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else if (typeof value === 'string') {
        conditions.push(`${key} = '${value.replace(/'/g, "''")}'`);
      } else if (typeof value === 'boolean') {
        conditions.push(`${key} = ${value}`);
      } else {
        conditions.push(`${key} = ${value}`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const sql = this.sql;
    const query = `UPDATE ${table} SET ${setClauses.join(', ')} ${whereClause} RETURNING *`;
    
    return await sql(query) as T[];
  }

  /**
   * Update a single row by ID
   */
  async updateById<T>(
    table: string,
    id: string,
    data: Record<string, unknown>,
    idColumn: string = 'id'
  ): Promise<T | undefined> {
    const rows = await this.update<T>(table, { [idColumn]: id }, data);
    return rows?.[0];
  }

  /**
   * Delete rows by filter
   */
  async delete(
    table: string,
    filters: Record<string, string | number | boolean | null | undefined>
  ): Promise<number> {
    const conditions: string[] = [];
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined) continue;
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else if (typeof value === 'string') {
        conditions.push(`${key} = '${value.replace(/'/g, "''")}'`);
      } else if (typeof value === 'boolean') {
        conditions.push(`${key} = ${value}`);
      } else {
        conditions.push(`${key} = ${value}`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const sql = this.sql;
    const query = `DELETE FROM ${table} ${whereClause}`;
    
    await sql(query);
    return 1; // Neon doesn't return affected row count directly
  }

  /**
   * Delete a single row by ID
   */
  async deleteById(
    table: string,
    id: string,
    idColumn: string = 'id'
  ): Promise<boolean> {
    await this.delete(table, { [idColumn]: id });
    return true;
  }

  /**
   * Execute a custom SQL query (use sparingly)
   */
  async query<T>(sqlQuery: string): Promise<T[]> {
    const sql = this.sql;
    return await sql(sqlQuery) as T[];
  }
}
