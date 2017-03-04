(function () {

    const Const = {
        MAX_ZOOM: 150,
        MIN_ZOOM: 50,
        DETECTION: 50,
        JUMP_HEIGHT: 600
    };

    var Textures = {};

    var PLAY = true;

    var scene, camera, renderer;
    var planeGeometry, planeMaterial, planeMesh;
    var playerGeometry, playerMaterial, playerMesh;
    var enemyGeometry, enemyMaterial, enemyMesh;

    var speed = 50;
    var score = 0;

    var handModel = {};

    var loader = new THREE.TextureLoader();
    loader.load('img/road.jpg', function (roadTexture) {
        roadTexture.wrapS = THREE.RepeatWrapping;
        roadTexture.wrapT = THREE.RepeatWrapping;
        roadTexture.repeat.set(10, 10);
        Textures.ROAD = roadTexture;
        loader.load('img/box.png', function (boxTexture) {
            Textures.BOX = boxTexture;
            loader.load('img/sky.jpg', function (skyTexture) {
                Textures.SKY = skyTexture;
            });
            init();
            animate();
        })
    });

    function init() {
        scene = new THREE.Scene();

        // Camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
        camera.position.z = 1000;
        camera.position.y = 500;

        // Plane
        planeGeometry = new THREE.PlaneBufferGeometry(4000, 10000);
        planeMaterial = new THREE.MeshBasicMaterial({map: Textures.ROAD});
        planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
        planeMesh.rotation.x = -Math.PI / 2;
        scene.add(planeMesh);

        // Player (Currently a cube)
        playerGeometry = new THREE.IcosahedronBufferGeometry(150);
        playerMaterial = new THREE.MeshBasicMaterial({color: 0x910D1A});
        playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
        playerMesh.position.y = 100;
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

        if (handModel.extended) {
            playerMesh.position.x = slideLateral();
            playerMesh.position.y = jumpVertical();
        }

        playerMesh.rotation.x += speed / 2;
        enemyMesh.position.z += speed;
        Textures.ROAD.offset.y += speed / 3000;
        Textures.ROAD.needsUpdate = true;

        if (enemyMesh.position.z > 1000) {
            speed += 2;
            updateScore();
            scene.remove(enemyMesh);
            generateEnemy();
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
            var menu = document.getElementById("menu");
            menu.style.display = 'block';
            document.getElementById("reset-button").addEventListener("click", function () {
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

    Leap.loop({
        hand: function (hand) {
            handModel = {
                x: hand._translation[0],
                y: hand._translation[1],
                z: hand._translation[2],
                extended: hand.fingers[1].extended
            }
        }
    });

    window.onresize = function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };

})();
