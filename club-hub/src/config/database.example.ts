/**
 * Database Configuration Example
 * 
 * Copy this file to .env.local and fill in your database credentials:
 * 
 * DB_HOST=localhost
 * DB_PORT=3306
 * DB_USER=root
 * DB_PASSWORD=your_password
 * DB_NAME=olympique_beja
 * 
 * Make sure your MariaDB database is created and the schema is imported from sql/olympique_beja_db_complete.sql
 */

export const databaseConfig = {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    username: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "olympique_beja",
};

