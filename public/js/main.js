(function () {

    const Const = {
        MAX_ZOOM: 150,
        MIN_ZOOM: 50,
        DETECTION: 50,
        JUMP_HEIGHT: 600
    };

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
    var planeGeometry, planeMaterial, planeMesh;
    var playerMesh;
    var enemyGeometry, enemyMaterial, enemyMesh;

    var speed = 50;
    var score = 0;

    var handModel = {};

    var manager = new THREE.LoadingManager();
    manager.onProgress = function (item, loaded, total) {
        console.log(item, loaded, total);
    };

    var objectLoader = new THREE.OBJLoader(manager);
    var loader = new THREE.TextureLoader(manager);
    loader.load('img/road.jpg', function (roadTexture) {
        roadTexture.wrapS = THREE.RepeatWrapping;
        roadTexture.wrapT = THREE.RepeatWrapping;
        roadTexture.repeat.set(10, 10);
        Textures.ROAD = roadTexture;
        loader.load('img/box.png', function (boxTexture) {
            Textures.BOX = boxTexture;
            loader.load('img/sky.jpg', function (skyTexture) {
                Textures.SKY = skyTexture;
                objectLoader.load('models/arwing.obj', function (arwing) {
                    arwing.traverse(function (child) {
                        if (child instanceof THREE.Mesh) {
                            loader.load('models/arwing.png', function (texture) {
                                child.material = new THREE.MeshBasicMaterial({map: texture});
                            });
                        }
                    });
                    arwing.scale.x = 100;
                    arwing.scale.y = 100;
                    arwing.scale.z = 100;
                    arwing.rotation.y = Math.PI;
                    playerMesh = arwing;

                    init();
                    animate();
                });
            });
        })
    });

    function init() {

        Sounds.MAIN_THEME.volume = 0.7;
        Sounds.MAIN_THEME.play();

        scene = new THREE.Scene();

        // Camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
        camera.position.z = 1000;
        camera.position.y = 700;

        // Plane
        planeGeometry = new THREE.PlaneBufferGeometry(4000, 10000);
        planeMaterial = new THREE.MeshBasicMaterial({map: Textures.ROAD});
        planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
        planeMesh.rotation.x = -Math.PI / 2;
        scene.add(planeMesh);

        // Player
        scene.add(playerMesh);

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

        playerMesh.position.x = slideLateral();
        playerMesh.position.y = jumpVertical();
        if (handModel.extended) {
            shootBullet();
        }

        enemyMesh.position.z += speed * 2;
        Textures.ROAD.offset.y += speed / 3500;
        Textures.ROAD.needsUpdate = true;

        if (enemyMesh.position.z > 1000) {
            speed += 2;
            updateScore();
            scene.remove(enemyMesh);
            generateEnemy();
        }

        if (!!BARRELLING) {
            playerMesh.rotation.z += (0.15 * BARRELLING);
            console.log(playerMesh.rotation.z);
            if ((BARRELLING === 1 && playerMesh.rotation.z > 2 * Math.PI) || (BARRELLING === -1 && playerMesh.rotation.z < -(2 * Math.PI))) {
                BARRELLING = false;
                setTimeout(function(){ BARRELLING = undefined }, 2000);
                playerMesh.rotation.z = 0;
            }
        }


        checkCollision();

        renderer.render(scene, camera);

        resetHandModel();
    }

    function updateScore() {
        ++score;
        document.getElementById("score").innerHTML = String(score);
    }

    function checkCollision() {
        var firstBB = new THREE.Box3().setFromObject(playerMesh);
        var secondBB = new THREE.Box3().setFromObject(enemyMesh);
        if (firstBB.intersectsBox(secondBB)) {
            PLAY = false;
            Sounds.MAIN_THEME.volume = 0.2;
            Sounds.COLLISION.play();
            var menu = document.getElementById("menu");
            menu.style.display = 'block';
            document.getElementById("menuHighScore").innerHTML = treatHighScore();
            document.getElementById("reset-button").addEventListener("click", function () {
                Sounds.MAIN_THEME.pause();
                menu.style.display = 'none';
                window.location.reload();
            });
        }
    }

    // X-axis movement (Positive -> Right, Negative -> Left)
    function slideLateral() {
        const width = window.innerWidth / 2;
        if (handModel.x > Const.DETECTION)
            return width;
        else if (handModel.x < -Const.DETECTION)
            return -width;
        return 0;
    }

    // Y-axis movement (Positive -> Up, Negative -> Down)
    function jumpVertical() {
        if (handModel.y > Const.DETECTION && playerMesh.position.y === 100) {
            return Const.JUMP_HEIGHT;
        } else if (handModel.y < Const.DETECTION) {
            return 100;
        } else {
            return playerMesh.position.y;
        }
    }

    function shootBullet() {
        Sounds.BLASTER.play();
    }

    // Enemy
    function generateEnemy() {
        enemyGeometry = new THREE.BoxGeometry(400, 400, 400);
        enemyMaterial = new THREE.MeshBasicMaterial({map: Textures.BOX});
        enemyMesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
        enemyMesh.position.x = Math.floor(((Math.random() - 0.5) * window.innerWidth * 2));
        enemyMesh.position.y = 200;
        enemyMesh.position.z = -5000;
        scene.add(enemyMesh);
    }

    function resetHandModel() {
        handModel = {
            x: 0,
            y: 0,
            z: 0,
            extended: false
        }
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
                x: hand._translation[0],
                y: hand._translation[1],
                z: hand._translation[2],
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
                            var pointableID = gesture.pointableIds[0];
                            var direction = frame.pointable(pointableID).direction;
                            var dotProduct = Leap.vec3.dot(direction, gesture.normal);
                            BARRELLING = dotProduct > 0 ? 1 : -1;
                            Sounds.BARREL_ROLL.play();
                        }
                }
            });
        }
    });

})();
