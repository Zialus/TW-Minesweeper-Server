CREATE TABLE users (
   name VARCHAR(32) NOT NULL,
   pass VARCHAR(32) NOT NULL,
   salt VARCHAR(4) NOT NULL,
   PRIMARY KEY (name)
);

CREATE TABLE rankings (
   name VARCHAR(32) NOT NULL,
   level VARCHAR(20) NOT NULL CHECK (level IN ('beginner', 'intermediate', 'expert')),
   score INTEGER NOT NULL,
   timestamp BIGINT NOT NULL,
   PRIMARY KEY (name, level),
   FOREIGN KEY (name) REFERENCES users (name) ON DELETE CASCADE
);

CREATE INDEX idx_rankings_level_score_timestamp ON rankings (level, score, timestamp);

