DELETE FROM rankings;
DELETE FROM users WHERE name IN ('rprior1', 'rprior2', 'rprior3', 'jdoe1', 'jdoe2', 'jdoe3', 'jdoe4', 'jdoe5', 'jdoe6', 'jdoe7', 'dontshow1', 'dontshow2');

INSERT INTO users VALUES('rprior1', '645e1a00fa49d350afb109694bd253e7', 'VDvC');
INSERT INTO users VALUES('rprior2', '645e1a00fa49d350afb109694bd253e7', 'VDvC');
INSERT INTO users VALUES('rprior3', '645e1a00fa49d350afb109694bd253e7', 'VDvC');
INSERT INTO users VALUES('jdoe1', '2cffc82c8f299f53c03eeac457825f73', 'vRRk');
INSERT INTO users VALUES('jdoe2', '2cffc82c8f299f53c03eeac457825f73', 'vRRk');
INSERT INTO users VALUES('jdoe3', '2cffc82c8f299f53c03eeac457825f73', 'vRRk');
INSERT INTO users VALUES('jdoe4', '2cffc82c8f299f53c03eeac457825f73', 'vRRk');
INSERT INTO users VALUES('jdoe5', '2cffc82c8f299f53c03eeac457825f73', 'vRRk');
INSERT INTO users VALUES('jdoe6', '2cffc82c8f299f53c03eeac457825f73', 'vRRk');
INSERT INTO users VALUES('jdoe7', '2cffc82c8f299f53c03eeac457825f73', 'vRRk');
INSERT INTO users VALUES('dontshow1', '04de249f68ea0b40ec5563b246a77273', 'dc4i');
INSERT INTO users VALUES('dontshow2', '04de249f68ea0b40ec5563b246a77273', 'dc4i');

INSERT INTO rankings VALUES('dontshow2', 'beginner', 3, 1356068916476);
INSERT INTO rankings VALUES('dontshow1', 'beginner', 5, 1355068926476);
INSERT INTO rankings VALUES('jdoe7', 'beginner', 10, 1355068922742);
INSERT INTO rankings VALUES('jdoe6', 'beginner', 20, 1355068916476);
INSERT INTO rankings VALUES('jdoe5', 'beginner', 20, 1355068912456);
INSERT INTO rankings VALUES('jdoe4', 'beginner', 20, 1355068903756);
INSERT INTO rankings VALUES('jdoe3', 'beginner', 60, 1355068907706);
INSERT INTO rankings VALUES('jdoe2', 'beginner', 70, 1355068922742);
INSERT INTO rankings VALUES('jdoe1', 'beginner', 82, 1355068916476);
INSERT INTO rankings VALUES('rprior3', 'beginner', 85, 1355068912456);
INSERT INTO rankings VALUES('rprior2', 'beginner', 90, 1355068903756);
INSERT INTO rankings VALUES('rprior1', 'beginner', 99, 1355068907706);

