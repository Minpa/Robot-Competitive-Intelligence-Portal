-- Update robot images to use locally served files from /public/robots/
-- Run this in your Railway Postgres console (or any SQL client connected to production DB)

UPDATE humanoid_robots SET image_url = '/robots/optimus.jpg' WHERE name = 'Optimus Gen 2';
UPDATE humanoid_robots SET image_url = '/robots/atlas.jpg' WHERE name = 'Atlas (Electric)';
UPDATE humanoid_robots SET image_url = '/robots/digit.webp' WHERE name = 'Digit';
UPDATE humanoid_robots SET image_url = '/robots/figure01.jpg' WHERE name = 'Figure 01';
UPDATE humanoid_robots SET image_url = '/robots/neo.webp' WHERE name = 'NEO';
UPDATE humanoid_robots SET image_url = '/robots/unitree-h1.jpg' WHERE name = 'H1';
UPDATE humanoid_robots SET image_url = '/robots/unitree-g1.jpg' WHERE name = 'G1';
UPDATE humanoid_robots SET image_url = '/robots/walker-x.png' WHERE name = 'Walker X';
UPDATE humanoid_robots SET image_url = '/robots/cyberone.jpg' WHERE name = 'CyberOne';
UPDATE humanoid_robots SET image_url = '/robots/gr1.webp' WHERE name = 'GR-1';
UPDATE humanoid_robots SET image_url = '/robots/phoenix.webp' WHERE name = 'Phoenix';
UPDATE humanoid_robots SET image_url = '/robots/pepper.jpg' WHERE name = 'Pepper';
UPDATE humanoid_robots SET image_url = '/robots/tiago.jpg' WHERE name = 'TIAGo';
UPDATE humanoid_robots SET image_url = '/robots/optimus.jpg' WHERE name = 'Optimus Gen 3';
UPDATE humanoid_robots SET image_url = '/robots/figure02.png' WHERE name = 'Figure 02';
UPDATE humanoid_robots SET image_url = '/robots/neo.webp' WHERE name = 'NEO Beta';
UPDATE humanoid_robots SET image_url = '/robots/unitree-g1.jpg' WHERE name = 'G1 Pro';
UPDATE humanoid_robots SET image_url = '/robots/optimus.jpg' WHERE name = 'Optimus Production';
UPDATE humanoid_robots SET image_url = '/robots/atlas.jpg' WHERE name = 'Atlas Pro';
UPDATE humanoid_robots SET image_url = '/robots/digit.webp' WHERE name = 'Digit v3';
UPDATE humanoid_robots SET image_url = '/robots/phoenix.webp' WHERE name = 'Phoenix Gen 8';
UPDATE humanoid_robots SET image_url = '/robots/hubo.jpg' WHERE name = 'HUBO 2';
UPDATE humanoid_robots SET image_url = '/robots/asimo.jpg' WHERE name = 'Honda Avatar Robot';
UPDATE humanoid_robots SET image_url = '/robots/hubo.jpg' WHERE name = 'HUBO';
UPDATE humanoid_robots SET image_url = '/robots/tiago.jpg' WHERE name = 'TALOS';

-- Verify results
SELECT name, image_url FROM humanoid_robots ORDER BY name;
