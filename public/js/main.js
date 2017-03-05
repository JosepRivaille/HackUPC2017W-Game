function game() {

    const Sounds = {
        MAIN_THEME: document.getElementById('main-sound'),
        COLLISION: document.getElementById('collision-sound'),
        BARREL_ROLL: document.getElementById('barrel-roll'),
        BOMB_PICKUP: document.getElementById('bomb-pickup'),
        BOMB_EXPLOSION: document.getElementById('bomb-explosion')
    };

    var Textures = {};

    var PLAY = true;
    var BARRELLING = undefined;
    var SHOOTING = false;

    // Basic ThreeJS elements
    var scene, camera, renderer;

    // Explosion
    var movementSpeed = 100;
    var totalObjects = 1000;
    var objectSize = 50;
    var colors = [0xD4F4EB, 0x65C4E1];
    var dirs = [];
    var parts = [];

    // Plane
    var planeGeometry, planeMaterial, planeMesh;

    var playerMesh, enemyMesh;
    var enemiesMesh = [];

    var speed = 50;
    var score = 0;

    var handModel = {};

    imports();
    setTimeout(function () {
        init();
        animate();
    }, 1000);

    function imports() {
        var manager = new THREE.LoadingManager();
        manager.onProgress = function (item, loaded, total) {
            console.log(loaded + ' - ' + total);
        };
        var objectLoader = new THREE.OBJLoader(manager);
        var loader = new THREE.TextureLoader(manager);

        loader.load('img/planet.jpg', function (planetTexture) {
            planetTexture.wrapS = THREE.RepeatWrapping;
            planetTexture.wrapT = THREE.RepeatWrapping;
            planetTexture.repeat.set(1, 1);
            Textures.PLANET = planetTexture;
        });
        objectLoader.load('models/arwing.obj', function (arwingObj) {
            arwingObj.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    loader.load('models/arwing.png', function (texture) {
                        child.material = new THREE.MeshLambertMaterial({map: texture});
                    });
                }
            });
            arwingObj.scale.x = 75;
            arwingObj.scale.y = 75;
            arwingObj.scale.z = 75;
            arwingObj.rotation.y = Math.PI;
            arwingObj.position.y = 50;
            playerMesh = arwingObj;
        });
        objectLoader.load('models/meteor.obj', function (meteorObj) {
            meteorObj.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    loader.load('models/meteor.png', function (texture) {
                        child.material = new THREE.MeshLambertMaterial({map: texture, side: THREE.DoubleSide});
                    });
                }
            });
            enemyMesh = meteorObj;
        });
    }

    function init() {
        Sounds.MAIN_THEME.volume = 0.7;
        Sounds.MAIN_THEME.play();

        scene = new THREE.Scene();

        // Camera
        camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 10000);
        camera.position.z = 1000;
        camera.position.y = 300;

        // Light
        var light = new THREE.AmbientLight(0XFFFFFF);
        scene.add(light);

        // Plane
        planeGeometry = new THREE.PlaneBufferGeometry(10000, 10000);
        planeMaterial = new THREE.MeshLambertMaterial({map: Textures.PLANET});
        planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
        planeMesh.rotation.x = -Math.PI / 2;
        scene.add(planeMesh);

        // Player
        scene.add(playerMesh);

        updateScore();

        function createHorde() {
            var enemies = Math.floor(Math.random() * 8 + 1);
            for (var i = 0; i < enemies && enemiesMesh.length < 20; ++i) {
                generateEnemy();
            }
            setTimeout(function () {
                createHorde();
            }, Math.floor((Math.random() * 4) + 1) * 1000);
        }

        createHorde();

        // Render
        renderer = new THREE.WebGLRenderer({alpha: true});
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);

        document.body.appendChild(renderer.domElement);
    }

    function animate() {

        if (PLAY) {
            requestAnimationFrame(animate);
        }

        if (handModel.extended && !SHOOTING) {
            shootBomb();
        }

        camera.updateProjectionMatrix();

        controlMovement();

        enemiesMesh.forEach(function (enemyMesh, index) {
            enemyMesh.position.z += speed;
            if (enemyMesh.position.z > 1000) {
                ++speed;
                updateScore();
                scene.remove(enemyMesh);
                enemiesMesh.splice(index, 1);
            }
            checkCollision(enemyMesh);
        });

        Textures.PLANET.offset.y += speed / 8000;
        Textures.PLANET.needsUpdate = true;

        if (!!BARRELLING) {
            playerMesh.rotation.z += (0.15 * BARRELLING);
            if ((BARRELLING === 1 && playerMesh.rotation.z > 2 * Math.PI)
                || (BARRELLING === -1 && playerMesh.rotation.z < -2 * Math.PI)) {
                BARRELLING = false;
                setTimeout(function () {
                    BARRELLING = undefined
                }, 1000);
                playerMesh.rotation.z = 0;
            }
        }

        renderer.render(scene, camera);
    }

    function render() {
        requestAnimationFrame(render);

        var pCount = parts.length;
        while (pCount--) {
            parts[pCount].update();
        }

        renderer.render(scene, camera);

    }

    function updateScore() {
        ++score;
        document.getElementById("score").innerHTML = String(score);
        document.getElementById("speed").innerHTML = String(speed);
        if (score%100 === 0) {
            var currentBombs = document.getElementById('bombs').textContent;
            document.getElementById('bombs').innerHTML = String(currentBombs + 1);
            Sounds.BOMB_PICKUP.play();
        }
    }

    function checkCollision(enemyMesh) {
        var firstBB = new THREE.Box3().setFromObject(playerMesh);
        var secondBB = new THREE.Box3().setFromObject(enemyMesh);
        if (firstBB.intersectsBox(secondBB)) {
            PLAY = false;
            Sounds.MAIN_THEME.volume = 0.2;
            Sounds.COLLISION.play();
            var menu = document.getElementById("hud-menu");
            menu.style.display = 'block';
            document.getElementById("high-score").innerHTML = treatHighScore();
            document.getElementById("reset-button").addEventListener("click", function () {
                Sounds.MAIN_THEME.pause();
                menu.style.display = 'none';
                window.location.reload();
            });
        }
    }

    // Movement controller
    function controlMovement() {
        if (handModel.x > -300 && handModel.x < 300) {
            playerMesh.position.x = handModel.x * 6;
            if (!BARRELLING) {
                playerMesh.rotation.z = -handModel.x * 0.0025;
            }
        }
        if (handModel.y > 50 && handModel.y < 200) {
            playerMesh.position.y = handModel.y * 5 - 250;
        }
    }

    function shootBomb() {
        var currentBombs = document.getElementById('bombs').textContent;
        if (currentBombs > 0) {
            Sounds.BOMB_EXPLOSION.play();
            SHOOTING = true;
            setTimeout(function () {
                SHOOTING = false;
            }, 5000);
            setTimeout(function () {
                parts.push(new ExplodeAnimation(playerMesh.position.x, playerMesh.position.y, -5000));
            }, 1500);
            render();
            document.getElementById('bombs').innerHTML = String(currentBombs - 1);
            enemiesMesh.forEach(function (enemy, index) {
                if (enemy.position.x > playerMesh.position.x - 200 && enemy.position.x < playerMesh.position.x + 200 &&
                    enemy.position.y > playerMesh.position.y - 200 && enemy.position.y < playerMesh.position.y + 200) {
                    scene.remove(enemy);
                    enemiesMesh.splice(index, 1);
                }
            });
        }
    }

    function generateEnemy() {
        var randSize = (Math.random() * 3 + 1) * (!!Math.floor(Math.random()) ? -1 : 1);
        var newEnemyMesh = enemyMesh.clone();
        newEnemyMesh.scale.x = randSize;
        newEnemyMesh.scale.y = randSize;
        newEnemyMesh.scale.z = randSize;
        newEnemyMesh.rotation.x += randSize * randSize;
        newEnemyMesh.rotation.y -= randSize + randSize;
        newEnemyMesh.rotation.z += randSize;
        newEnemyMesh.position.x = Math.floor(((Math.random() - 0.5) * window.innerWidth * 2));
        newEnemyMesh.position.y = Math.floor(((Math.random() - 0.5) * window.innerHeight)) + window.innerHeight;
        newEnemyMesh.position.z = -10000;
        scene.add(newEnemyMesh);
        enemiesMesh.push(newEnemyMesh);
    }

    function getCookie(cookieName) {
        var name = cookieName + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }

    function treatHighScore() {
        var highScore = getCookie("highScore");
        if (highScore === '' || eval(score > highScore)) {
            document.cookie = 'highScore=' + score;
        }
        return highScore;
    }

    function ExplodeAnimation(x, y, z) {
        var geometry = new THREE.Geometry();

        for (var i = 0; i < totalObjects; i++) {
            var vertex = new THREE.Vector3();
            vertex.x = x;
            vertex.y = y;
            vertex.z = z;

            geometry.vertices.push(vertex);
            dirs.push({
                x: (Math.random() * movementSpeed) - (movementSpeed / 2),
                y: (Math.random() * movementSpeed) - (movementSpeed / 2),
                z: (Math.random() * movementSpeed) - (movementSpeed / 2)
            });
        }
        var material = new THREE.ParticleBasicMaterial({
            size: objectSize,
            color: colors[Math.round(Math.random() * colors.length)]
        });
        this.object = new THREE.ParticleSystem(geometry, material);
        this.status = true;

        scene.add(this.object);

        this.update = function () {
            if (this.status == true) {
                var pCount = totalObjects;
                while (pCount--) {
                    var particle = this.object.geometry.vertices[pCount];
                    particle.y += dirs[pCount].y;
                    particle.x += dirs[pCount].x;
                    particle.z += dirs[pCount].z;
                }
                this.object.geometry.verticesNeedUpdate = true;
            }
        }

    }

    window.onresize = function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };

    Leap.loop({
        hand: function (hand) {
            handModel = {
                x: hand.palmPosition[0],
                y: hand.palmPosition[1],
                extended: hand.fingers[1].extended && hand.fingers[2].extended && !hand.fingers[3].extended && !hand.fingers[3].extended && hand.confidence > 0.7
            };
        },
        enableGestures: true
    }, function (frame) {
        if (frame.valid && frame.gestures.length > 0) {
            frame.gestures.forEach(function (gesture) {
                switch (gesture.type) {
                    case "circle":
                        if (BARRELLING === undefined) {
                            Sounds.BARREL_ROLL.volume = 0.5;
                            Sounds.BARREL_ROLL.play();
                            setTimeout(function () {
                                BARRELLING = Leap.vec3.dot(frame.pointable(gesture.pointableIds[0]).direction, gesture.normal) > 0 ? 1 : -1;
                            }, 250);
                        }
                }
            });
        }
    });
}

(function () {
    function play() {
        game();
    }

    play();
})();