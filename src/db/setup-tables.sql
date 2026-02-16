
DROP DOMAIN IF EXISTS t_username CASCADE;

CREATE DOMAIN t_username AS VARCHAR(32)
CHECK (
  length(VALUE) BETWEEN 1 AND 32
);

DROP TABLE IF EXISTS users CASCADE ;

CREATE TABLE users ( 
    id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, 
    username t_username NOT NULL UNIQUE, 
    email TEXT NOT NULL UNIQUE 
);

DROP TABLE IF EXISTS passwords;

CREATE TABLE passwords (
    user_id int PRIMARY KEY REFERENCES users(id), 
    user_password VARCHAR(64) NOT NULL
);
