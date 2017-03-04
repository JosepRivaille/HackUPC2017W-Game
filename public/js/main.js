(function () {

    const Const = {
        MAX_ZOOM: 150,
        MIN_ZOOM: 50,
        DETECTION: 50
    };

    var Textures = {
        ROAD: undefined,
        BOX: undefined
    };

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
        playerGeometry = new THREE.BoxGeometry(200, 200, 200);
        playerMaterial = new THREE.MeshBasicMaterial({color: 0x910D1A});
        playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
        playerMesh.position.y = 100;
        scene.add(playerMesh);

        generateEnemy();

        // Render
        renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x99CCFF, 1);

        document.body.appendChild(renderer.domElement);
    }

    function animate() {

        requestAnimationFrame(animate);

        camera.updateProjectionMatrix();

        if (handModel.extended) {
            playerMesh.position.x = slideLateral();
        }

        if (enemyMesh !== undefined) {
            enemyMesh.position.z += speed;
            Textures.ROAD.offset.y += speed / 3000;
            Textures.ROAD.needsUpdate = true;
            if (enemyMesh.position.z > 1000) {
                ++speed;
                ++score;
                scene.remove(enemyMesh);
                generateEnemy();
            }

            if (checkCollision()) {
                //alert(score);
            }
        }

        renderer.render(scene, camera);

        resetHandModel();
    }

    function checkCollision() {
        var firstBB = new THREE.Box3().setFromObject(playerMesh);
        var secondBB = new THREE.Box3().setFromObject(enemyMesh);
        return firstBB.intersectsBox(secondBB);
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
