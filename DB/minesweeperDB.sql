CREATE TABLE Users (
   name VARCHAR(32) NOT NULL,
   pass VARCHAR(32) NOT NULL,
   salt VARCHAR(4)  NOT NULL,
   PRIMARY KEY (name)
)
ENGINE=INNODB;


CREATE TABLE Rankings (
   name       VARCHAR(32) NOT NULL,
   level      ENUM('beginner', 'intermediate', 'expert') NOT NULL,
   score      INT NOT NULL,
   timestamp  BIGINT NOT NULL,
   INDEX (level, score, timestamp),
   PRIMARY KEY (name, level),
   FOREIGN KEY (name) REFERENCES Users (name) ON DELETE CASCADE
)
ENGINE=INNODB;

