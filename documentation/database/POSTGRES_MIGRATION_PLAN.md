# Plan: Migrating from Mock Data to PostgreSQL

This document outlines the steps to migrate the application's data layer from a mock data implementation to a robust PostgreSQL database.

## 1. Database Schema Design

Based on the interfaces in `types.ts`, we will create the following tables.

### `users`
- `id` SERIAL PRIMARY KEY
- `username` VARCHAR(255) UNIQUE NOT NULL
- `password_hash` VARCHAR(255) NOT NULL
- `role` VARCHAR(50) NOT NULL
- `is_active` BOOLEAN DEFAULT true

### `roles`
- `role_name` VARCHAR(50) PRIMARY KEY
- `permissions` TEXT[]

### `patients`
- `id` SERIAL PRIMARY KEY
- `salutation` VARCHAR(10)
- `name` VARCHAR(255) NOT NULL
- `age_years` INT
- `age_months` INT
- `age_days` INT
- `sex` VARCHAR(10)
- `guardian_name` VARCHAR(255)
- `phone` VARCHAR(20)
- `address` TEXT
- `email` VARCHAR(255)
- `clinical_history` TEXT

### `clients`
- `id` SERIAL PRIMARY KEY
- `name` VARCHAR(255) NOT NULL
- `type` VARCHAR(50) NOT NULL
- `balance` NUMERIC(10, 2) DEFAULT 0

### `test_templates`
- `id` SERIAL PRIMARY KEY
- `code` VARCHAR(50) UNIQUE NOT NULL
- `name` VARCHAR(255) NOT NULL
- `category` VARCHAR(100)
- `price` NUMERIC(10, 2) NOT NULL
- `b2b_price` NUMERIC(10, 2) NOT NULL
- `is_active` BOOLEAN DEFAULT true
- `parameters` JSONB
- `report_type` VARCHAR(50) NOT NULL
- `default_antibiotic_ids` INT[]

### `antibiotics`
- `id` SERIAL PRIMARY KEY
- `name` VARCHAR(255) NOT NULL
- `abbreviation` VARCHAR(10) NOT NULL
- `is_active` BOOLEAN DEFAULT true

### `visits`
- `id` SERIAL PRIMARY KEY
- `patient_id` INT REFERENCES patients(id)
- `referred_doctor_id` INT
- `ref_customer_id` INT REFERENCES clients(id)
- `other_ref_doctor` VARCHAR(255)
- `other_ref_customer` VARCHAR(255)
- `registration_datetime` TIMESTAMP
- `visit_code` VARCHAR(50) UNIQUE NOT NULL
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
- `total_cost` NUMERIC(10, 2)
- `amount_paid` NUMERIC(10, 2)
- `payment_mode` VARCHAR(50)
- `due_amount` NUMERIC(10, 2)

### `visit_tests`
- `id` SERIAL PRIMARY KEY
- `visit_id` INT REFERENCES visits(id)
- `template_id` INT REFERENCES test_templates(id)
- `status` VARCHAR(50) NOT NULL
- `collected_by` VARCHAR(255)
- `collected_at` TIMESTAMP WITH TIME ZONE
- `specimen_type` VARCHAR(100)
- `results` JSONB
- `culture_result` JSONB
- `approved_by` VARCHAR(255)
- `approved_at` TIMESTAMP WITH TIME ZONE

### `signatories`
- `id` SERIAL PRIMARY KEY
- `name` VARCHAR(255) NOT NULL
- `title` VARCHAR(255) NOT NULL

### `client_prices`
- `client_id` INT REFERENCES clients(id)
- `test_template_id` INT REFERENCES test_templates(id)
- `price` NUMERIC(10, 2) NOT NULL
- PRIMARY KEY (client_id, test_template_id)

### `ledger_entries`
- `id` SERIAL PRIMARY KEY
- `client_id` INT REFERENCES clients(id)
- `visit_id` INT REFERENCES visits(id)
- `type` VARCHAR(10) NOT NULL
- `amount` NUMERIC(10, 2) NOT NULL
- `description` TEXT
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

### `audit_logs`
- `id` SERIAL PRIMARY KEY
- `timestamp` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
- `username` VARCHAR(255) NOT NULL
- `action` VARCHAR(255) NOT NULL
- `details` TEXT

## 2. Backend Setup

We will create a new `server` directory for the backend application.

- **Technology Stack:** Node.js with Express.js and the `pg` library for PostgreSQL interaction.
- **Database Connection:** Create a configuration file for database credentials.
- **API Endpoints:** Develop a RESTful API with endpoints for each data entity (e.g., `/api/patients`, `/api/visits`). Each endpoint will handle CRUD (Create, Read, Update, Delete) operations.

## 3. Frontend Changes

- **API Client:** Create a dedicated API client service in the frontend to handle all HTTP requests to the new backend.
- **Component Refactoring:** Systematically refactor each component that currently imports from `api/mock.ts`. These components will now use the new API client to fetch and update data.
- **State Management:** Ensure that the application's state management (React Context) is updated to handle asynchronous data fetching, including loading and error states.

## 4. Data Migration

- **Migration Script:** A one-time script will be created to read the data from `api/mock.ts` and insert it into the newly created PostgreSQL tables. This will provide initial data for development and testing.

## 5. Environment Setup

- **PostgreSQL Installation:** Provide instructions for setting up a local PostgreSQL server, preferably using Docker for consistency across development environments.
- **Environment Variables:** Use a `.env` file to manage database connection strings and other sensitive information.

This plan provides a high-level overview. Each step will require detailed implementation.
