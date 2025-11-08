-- Migration: Add user_permissions table for custom user permissions
-- This allows individual users to have custom permissions that override role defaults

-- Create user_permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, permission)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);

-- Insert default permissions for existing users based on their roles
-- This ensures existing users have permissions from their role

-- SUDO users get all permissions
INSERT INTO user_permissions (user_id, permission)
SELECT u.id, unnest(rp.permissions)
FROM users u
JOIN role_permissions rp ON u.role = rp.role
WHERE u.role = 'SUDO'
ON CONFLICT (user_id, permission) DO NOTHING;

-- ADMIN users
INSERT INTO user_permissions (user_id, permission)
SELECT u.id, unnest(rp.permissions)
FROM users u
JOIN role_permissions rp ON u.role = rp.role
WHERE u.role = 'ADMIN'
ON CONFLICT (user_id, permission) DO NOTHING;

-- RECEPTION users
INSERT INTO user_permissions (user_id, permission)
SELECT u.id, unnest(rp.permissions)
FROM users u
JOIN role_permissions rp ON u.role = rp.role
WHERE u.role = 'RECEPTION'
ON CONFLICT (user_id, permission) DO NOTHING;

-- PHLEBOTOMY users
INSERT INTO user_permissions (user_id, permission)
SELECT u.id, unnest(rp.permissions)
FROM users u
JOIN role_permissions rp ON u.role = rp.role
WHERE u.role = 'PHLEBOTOMY'
ON CONFLICT (user_id, permission) DO NOTHING;

-- LAB users
INSERT INTO user_permissions (user_id, permission)
SELECT u.id, unnest(rp.permissions)
FROM users u
JOIN role_permissions rp ON u.role = rp.role
WHERE u.role = 'LAB'
ON CONFLICT (user_id, permission) DO NOTHING;

-- APPROVER users
INSERT INTO user_permissions (user_id, permission)
SELECT u.id, unnest(rp.permissions)
FROM users u
JOIN role_permissions rp ON u.role = rp.role
WHERE u.role = 'APPROVER'
ON CONFLICT (user_id, permission) DO NOTHING;

-- Create a function to automatically add role permissions when a new user is created
CREATE OR REPLACE FUNCTION add_role_permissions_to_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert role permissions for the new user
    INSERT INTO user_permissions (user_id, permission)
    SELECT NEW.id, unnest(rp.permissions)
    FROM role_permissions rp
    WHERE rp.role = NEW.role
    ON CONFLICT (user_id, permission) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically add permissions when user is created
DROP TRIGGER IF EXISTS trigger_add_role_permissions ON users;
CREATE TRIGGER trigger_add_role_permissions
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION add_role_permissions_to_new_user();

-- Create a view for easy querying of users with their permissions
CREATE OR REPLACE VIEW users_with_permissions AS
SELECT 
    u.id,
    u.username,
    u.role,
    u.is_active,
    u.signature_image_url,
    u.created_at,
    u.updated_at,
    ARRAY_AGG(DISTINCT up.permission ORDER BY up.permission) FILTER (WHERE up.permission IS NOT NULL) as permissions
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
GROUP BY u.id, u.username, u.role, u.is_active, u.signature_image_url, u.created_at, u.updated_at;

