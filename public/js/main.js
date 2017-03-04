(function () {

    const Sounds = {
        MAIN_THEME: document.getElementById('main-sound'),
        COLLISION: document.getElementById('collision-sound'),
        BARREL_ROLL: document.getElementById('barrel-roll'),
        BLASTER: document.getElementById('blaster-sound')
    };

    var Textures = {};

    var PLAY = true;
    var BARRELLING = undefined;

    var scene, camera, renderer;
    var playerMesh, enemyMesh;
    var enemies = [];

    var speed = 30;
    var score = 0;
    var materials;

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

        loader.load('img/road.png', function (roadTexture) {
            roadTexture.wrapS = THREE.RepeatWrapping;
            roadTexture.wrapT = THREE.RepeatWrapping;
            roadTexture.repeat.set(1, 1);
            Textures.ROAD = {
                bottom: roadTexture.clone(),
                right: roadTexture.clone(),
                top: roadTexture.clone(),
                left: roadTexture.clone()
            };
            materials = [
                new THREE.MeshPhongMaterial( { map: Textures.ROAD.right, side: THREE.BackSide } ),
                new THREE.MeshPhongMaterial( { map: Textures.ROAD.left, side: THREE.BackSide } ),
                new THREE.MeshPhongMaterial( { map: Textures.ROAD.top, side: THREE.BackSide } ),
                new THREE.MeshPhongMaterial( { map: Textures.ROAD.bottom, side: THREE.BackSide } ),
                new THREE.MeshBasicMaterial({color:0x000000,
                    side:THREE.BackSide}), // Back
                new THREE.MeshBasicMaterial({color:0x000000,
                    side:THREE.BackSide}) // Front
            ];
        });

        loader.load('img/sky.jpg', function (skyTexture) {
            Textures.SKY = skyTexture;
        });
        objectLoader.load('models/arwing.obj', function (arwingObj) {
            arwingObj.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    loader.load('models/arwing.png', function (texture) {
                        child.material = new THREE.MeshLambertMaterial({map: texture});
                    });
                }
            });
            arwingObj.scale.x = 100;
            arwingObj.scale.y = 100;
            arwingObj.scale.z = 100;
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
        camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.01, 10000);
        camera.position.z = 1000;
        camera.position.y = 300;

        // Light
        var light = new THREE.AmbientLight(0XFFFFFF);
        scene.add(light);

        // Plane
        var geometry = new THREE.CubeGeometry( window.innerWidth*3, window.innerHeight*2, 10000 );
        //var material = new THREE.MeshPhongMaterial( { map: Textures.ROAD, side: THREE.BackSide } )
        var material = new THREE.MultiMaterial( materials );
        var cube = new THREE.Mesh( geometry, material );
        cube.position.y = window.innerHeight/2;

        scene.add( cube );


        // Player
        scene.add(playerMesh);

        updateScore();
        generateEnemy();

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

        camera.updateProjectionMatrix();

        controlMovement();

        if (handModel.extended) {
            shootBlaster();
        }

        enemies.forEach(function (enemyMesh, index) {
            enemyMesh.position.z += speed;
            if (enemyMesh.position.z > 1000) {
                ++speed;
                updateScore();
                scene.remove(enemyMesh);
                delete enemies[index];
                generateEnemy();
            }
            checkCollision(enemyMesh);
        });

        Textures.ROAD.left.offset.x -= speed / 4000;
        Textures.ROAD.left.needsUpdate = true;
        Textures.ROAD.right.offset.x += speed / 4000;
        Textures.ROAD.right.needsUpdate = true;
        Textures.ROAD.bottom.offset.y -= speed / 4000;
        Textures.ROAD.bottom.needsUpdate = true;
        Textures.ROAD.top.offset.y += speed / 4000;
        Textures.ROAD.top.needsUpdate = true;

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

    function updateScore() {
        ++score;
        document.getElementById("score").innerHTML = String(score);
        document.getElementById("speed").innerHTML = String(speed);
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
        if (handModel.y > 0 && handModel.y < 250) {
            playerMesh.position.y = handModel.y * 5 - 400;
        }
    }

    function shootBlaster() {
        Sounds.BLASTER.play();
    }

    // Enemy
    function generateEnemy() {
        var randSize = (Math.random() * 3 + 1) * (!!Math.floor(Math.random()) ? -1 : 1);
        enemyMesh.scale.x = randSize;
        enemyMesh.scale.y = randSize;
        enemyMesh.scale.z = randSize;
        enemyMesh.rotation.x += randSize * randSize;
        enemyMesh.rotation.y -= randSize + randSize;
        enemyMesh.rotation.z += randSize;
        enemyMesh.position.x = Math.floor(((Math.random() - 0.5) * window.innerWidth * 2));
        enemyMesh.position.y = Math.floor(((Math.random() - 0.5) * window.innerHeight)) + window.innerHeight / 2;
        enemyMesh.position.z = -10000;
        scene.add(enemyMesh);
        enemies.push(enemyMesh);
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

})();
