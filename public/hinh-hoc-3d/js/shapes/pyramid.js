/**
 * Pyramid Shape - Hình chóp tứ giác đều (Với tính năng trải hình)
 */

class PyramidShape {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.baseSize = 3;  // Cạnh đáy
        this.height = 4;    // Chiều cao
        this.opacity = 0.8;
        this.unfoldProgress = 0;

        // Store references
        this.faces = [];
        this.vertexPoints = [];
        this.edgeLines = null;

        this.createShape();
        this.scene.add(this.group);
    }

    createShape() {
        // Clear existing
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }
        this.faces = [];
        this.vertexPoints = [];

        const half = this.baseSize / 2;

        // Tính chiều cao nghiêng của mặt tam giác
        const slantHeight = Math.sqrt(this.height * this.height + (this.baseSize / 2) * (this.baseSize / 2));

        // Face configs for unfolding
        const faceConfigs = [
            { // Base (đáy - cố định)
                type: 'base',
                color: 0x06b6d4,
                pivot: [0, 0, 0],
                unfoldAngle: 0,
                name: 'base'
            },
            { // Front face
                vertices: [[-half, 0, half], [half, 0, half], [0, this.height, 0]],
                color: 0x10b981,
                pivot: [0, 0, half],
                unfoldAxis: 'x',
                unfoldAngle: Math.PI / 2 + 0.3,
                name: 'front'
            },
            { // Right face
                vertices: [[half, 0, half], [half, 0, -half], [0, this.height, 0]],
                color: 0xf59e0b,
                pivot: [half, 0, 0],
                unfoldAxis: 'z',
                unfoldAngle: -(Math.PI / 2 + 0.3),
                name: 'right'
            },
            { // Back face
                vertices: [[half, 0, -half], [-half, 0, -half], [0, this.height, 0]],
                color: 0x6366f1,
                pivot: [0, 0, -half],
                unfoldAxis: 'x',
                unfoldAngle: -(Math.PI / 2 + 0.3),
                name: 'back'
            },
            { // Left face
                vertices: [[-half, 0, -half], [-half, 0, half], [0, this.height, 0]],
                color: 0xec4899,
                pivot: [-half, 0, 0],
                unfoldAxis: 'z',
                unfoldAngle: Math.PI / 2 + 0.3,
                name: 'left'
            }
        ];

        // Create base
        this.createBase(faceConfigs[0]);

        // Create triangle faces
        for (let i = 1; i < faceConfigs.length; i++) {
            this.createTriangleFace(faceConfigs[i]);
        }

        // Edge lines
        this.createEdgeLines();

        // Vertex points
        this.createVertexPoints();

        // Apply current unfold progress
        this.setUnfoldProgress(this.unfoldProgress);
    }

    createBase(config) {
        const geometry = new THREE.PlaneGeometry(this.baseSize, this.baseSize);
        const material = new THREE.MeshPhongMaterial({
            color: config.color,
            transparent: true,
            opacity: this.opacity,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;

        const pivotGroup = new THREE.Group();
        pivotGroup.add(mesh);

        // Edge for base
        const edgeGeometry = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const edgeLine = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        edgeLine.rotation.x = -Math.PI / 2;
        pivotGroup.add(edgeLine);

        this.faces.push({
            group: pivotGroup,
            mesh: mesh,
            edgeLine: edgeLine,
            config: config
        });

        this.group.add(pivotGroup);
    }

    createTriangleFace(config) {
        const geometry = new THREE.BufferGeometry();
        const v = config.vertices;

        // Offset vertices relative to pivot
        const pivot = config.pivot;
        const positions = new Float32Array([
            v[0][0] - pivot[0], v[0][1] - pivot[1], v[0][2] - pivot[2],
            v[1][0] - pivot[0], v[1][1] - pivot[1], v[1][2] - pivot[2],
            v[2][0] - pivot[0], v[2][1] - pivot[1], v[2][2] - pivot[2]
        ]);

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.computeVertexNormals();

        const material = new THREE.MeshPhongMaterial({
            color: config.color,
            transparent: true,
            opacity: this.opacity,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Pivot group positioned at pivot point
        const pivotGroup = new THREE.Group();
        pivotGroup.position.set(pivot[0], pivot[1], pivot[2]);
        pivotGroup.add(mesh);

        // Edge line for this face
        const edgeGeometry = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const edgeLine = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        pivotGroup.add(edgeLine);

        this.faces.push({
            group: pivotGroup,
            mesh: mesh,
            edgeLine: edgeLine,
            config: config
        });

        this.group.add(pivotGroup);
    }

    createEdgeLines() {
        // Main edge lines visible when not unfolded
        const half = this.baseSize / 2;
        const points = [
            new THREE.Vector3(-half, 0, -half),
            new THREE.Vector3(half, 0, -half),
            new THREE.Vector3(half, 0, half),
            new THREE.Vector3(-half, 0, half),
            new THREE.Vector3(-half, 0, -half),
            new THREE.Vector3(0, this.height, 0),
            new THREE.Vector3(half, 0, -half),
            new THREE.Vector3(0, this.height, 0),
            new THREE.Vector3(half, 0, half),
            new THREE.Vector3(0, this.height, 0),
            new THREE.Vector3(-half, 0, half)
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        this.edgeLines = new THREE.Line(geometry, material);
        this.edgeLines.visible = this.unfoldProgress === 0;
        this.group.add(this.edgeLines);
    }

    createVertexPoints() {
        const half = this.baseSize / 2;
        const vertices = [
            [-half, 0, -half],
            [half, 0, -half],
            [half, 0, half],
            [-half, 0, half],
            [0, this.height, 0]
        ];

        const pointGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff4444 });

        vertices.forEach(pos => {
            const point = new THREE.Mesh(pointGeometry, pointMaterial);
            point.position.set(pos[0], pos[1], pos[2]);
            this.vertexPoints.push(point);
            this.group.add(point);
        });
    }

    setUnfoldProgress(progress) {
        this.unfoldProgress = progress;

        // Hide main edge lines when unfolding
        if (this.edgeLines) {
            this.edgeLines.visible = progress === 0;
        }

        // Hide vertex points when unfolding
        this.vertexPoints.forEach(point => {
            point.visible = progress === 0;
        });

        // Apply easing
        const easedProgress = Calculations.easing.easeInOutCubic(progress);

        // Animate each face
        this.faces.forEach(face => {
            const config = face.config;

            if (config.name === 'base') return;

            const angle = config.unfoldAngle * easedProgress;

            if (config.unfoldAxis === 'x') {
                face.group.rotation.x = angle;
            } else if (config.unfoldAxis === 'z') {
                face.group.rotation.z = angle;
            }
        });
    }

    setVisibility(options) {
        this.vertexPoints.forEach(point => {
            point.visible = options.vertices && this.unfoldProgress === 0;
        });

        if (this.edgeLines) {
            this.edgeLines.visible = options.edges && this.unfoldProgress === 0;
        }

        this.faces.forEach(face => {
            if (face.mesh) face.mesh.visible = options.faces;
            if (face.edgeLine) face.edgeLine.visible = options.edges;
        });
    }

    updateSize(param, value) {
        if (param === 'baseSize') this.baseSize = value;
        else if (param === 'height') this.height = value;
        this.createShape();
    }

    updateOpacity(opacity) {
        this.opacity = opacity;
        this.faces.forEach(face => {
            if (face.mesh && face.mesh.material) {
                face.mesh.material.opacity = opacity;
            }
        });
    }

    getStats() {
        const calc = Calculations.pyramid;
        return {
            vertices: calc.vertices,
            edges: calc.edges,
            faces: calc.faces,
            volume: Calculations.formatNumber(calc.volume(this.baseSize, this.height)),
            area: Calculations.formatNumber(calc.surfaceArea(this.baseSize, this.height))
        };
    }

    getControls() {
        return [
            {
                id: 'baseSize',
                label: 'CẠNH ĐÁY',
                min: 1,
                max: 6,
                step: 0.1,
                value: this.baseSize,
                unit: ''
            },
            {
                id: 'height',
                label: 'CHIỀU CAO',
                min: 1,
                max: 8,
                step: 0.1,
                value: this.height,
                unit: ''
            },
            {
                id: 'opacity',
                label: 'ĐỘ TRONG SUỐT',
                min: 0.1,
                max: 1,
                step: 0.1,
                value: this.opacity,
                unit: ''
            }
        ];
    }

    handleControl(id, value) {
        if (id === 'baseSize') {
            this.updateSize('baseSize', parseFloat(value));
        } else if (id === 'height') {
            this.updateSize('height', parseFloat(value));
        } else if (id === 'opacity') {
            this.updateOpacity(parseFloat(value));
        }
    }

    dispose() {
        this.scene.remove(this.group);
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
}
