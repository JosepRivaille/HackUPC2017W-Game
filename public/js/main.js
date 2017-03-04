(function () {

    const Const = {
        MAX_ZOOM: 150,
        MIN_ZOOM: 50,
        DETECTION: 50
    };

    var scene, camera, renderer;
    var geometry, material, mesh;

    var handModel = {};

    init();
    animate();

    function init() {
        scene = new THREE.Scene();

        geometry = new THREE.PlaneBufferGeometry(4000, 10000);
        material = new THREE.MeshPhongMaterial({color: 0x00FF00, side: THREE.DoubleSide});
        mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = Math.PI / 2;
        scene.add(mesh);

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
        camera.position.z = 1000;
        camera.position.y = 500;

        geometry = new THREE.BoxGeometry(200, 200, 200);
        material = new THREE.MeshBasicMaterial({color: 0x910D1A});
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 100;
        scene.add(mesh);

        renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x0000FF, 0.5);

        document.body.appendChild(renderer.domElement);
    }

    function animate() {

        requestAnimationFrame(animate);

        if (handModel.extended) {
            camera.updateProjectionMatrix();

            mesh.position.x = slideLateral();

            renderer.render(scene, camera);
        }

        resetHandModel();
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

    /*
    // Y-axis height (Positive -> Up, Negative -> Down)
    function getHeight() {
        if (handModel.y > 0)
            return mesh.position.y > window.innerHeight / 2 ? 0 : 10;
        else if (handModel.y < 0)
            return mesh.position.y < -window.innerHeight / 2 ? 0 : -10;
        return 0;
    }

    // Z-axis zoom (Positive -> Out, Negative -> In)
    function getZoom() {
        if (handModel.z > Const.DETECTION)
            return camera.fov < Const.MAX_ZOOM ? 1 : 0;
        else if (handModel.z < -Const.DETECTION)
            return camera.fov > Const.MIN_ZOOM ? -1 : 0;
        return 0;
    }*/


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
