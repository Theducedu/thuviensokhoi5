/**
 * Rectangular Prism Shape - Hình hộp chữ nhật (Với tính năng trải hình)
 */

class RectangularPrismShape {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.width = 4;  // a - chiều dài
        this.height = 2; // b - chiều rộng
        this.depth = 3;  // c - chiều cao
        this.opacity = 0.8;
        this.showUnitCubes = false;
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

        const hw = this.width / 2;
        const hh = this.height / 2;
        const hd = this.depth / 2;

        // Face configs for unfolding (similar to cube but with different dimensions)
        const faceConfigs = [
            { // Bottom (đáy - cố định khi trải)
                vertices: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]],
                color: 0x10b981,
                pivot: [0, -hh, 0],
                unfoldAxis: null,
                unfoldAngle: 0,
                name: 'bottom',
                width: this.width,
                depth: this.depth
            },
            { // Front  
                vertices: [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]],
                color: 0xf59e0b,
                pivot: [0, -hh, hd],
                unfoldAxis: 'x',
                unfoldAngle: Math.PI / 2,
                name: 'front',
                width: this.width,
                depth: this.height
            },
            { // Back
                vertices: [[hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]],
                color: 0xec4899,
                pivot: [0, -hh, -hd],
                unfoldAxis: 'x',
                unfoldAngle: -Math.PI / 2,
                name: 'back',
                width: this.width,
                depth: this.height
            },
            { // Left
                vertices: [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]],
                color: 0x8b5cf6,
                pivot: [-hw, -hh, 0],
                unfoldAxis: 'z',
                unfoldAngle: Math.PI / 2,
                name: 'left',
                width: this.depth,
                depth: this.height
            },
            { // Right
                vertices: [[hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]],
                color: 0x6366f1,
                pivot: [hw, -hh, 0],
                unfoldAxis: 'z',
                unfoldAngle: -Math.PI / 2,
                name: 'right',
                width: this.depth,
                depth: this.height
            },
            { // Top (mở từ front)
                vertices: [[-hw, hh, -hd], [hw, hh, -hd], [hw, hh, hd], [-hw, hh, hd]],
                color: 0x06b6d4,
                pivot: [0, hh, hd],
                unfoldAxis: 'x',
                unfoldAngle: Math.PI,
                name: 'top',
                parentFace: 'front',
                width: this.width,
                depth: this.depth
            }
        ];

        faceConfigs.forEach(config => {
            this.createFace(config);
        });

        // Edge lines
        this.createEdgeLines();

        // Vertex points
        this.createVertexPoints();

        // Unit cubes visualization
        if (this.showUnitCubes) {
            this.createUnitCubes();
        }

        // Apply current unfold progress
        this.setUnfoldProgress(this.unfoldProgress);
    }

    createFace(config) {
        const geometry = new THREE.BufferGeometry();

        const v = config.vertices;
        const pivot = config.pivot;

        // Offset vertices relative to pivot
        const positions = new Float32Array([
            v[0][0] - pivot[0], v[0][1] - pivot[1], v[0][2] - pivot[2],
            v[1][0] - pivot[0], v[1][1] - pivot[1], v[1][2] - pivot[2],
            v[2][0] - pivot[0], v[2][1] - pivot[1], v[2][2] - pivot[2],
            v[0][0] - pivot[0], v[0][1] - pivot[1], v[0][2] - pivot[2],
            v[2][0] - pivot[0], v[2][1] - pivot[1], v[2][2] - pivot[2],
            v[3][0] - pivot[0], v[3][1] - pivot[1], v[3][2] - pivot[2]
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

        // Pivot group
        const pivotGroup = new THREE.Group();
        pivotGroup.position.set(pivot[0], pivot[1], pivot[2]);
        pivotGroup.add(mesh);

        // Edge line
        const edgeGeometry = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const edgeLine = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        pivotGroup.add(edgeLine);

        // Wrapper for parent relationships (for top face)
        const wrapperGroup = new THREE.Group();
        wrapperGroup.add(pivotGroup);

        this.faces.push({
            group: wrapperGroup,
            pivotGroup: pivotGroup,
            mesh: mesh,
            edgeLine: edgeLine,
            config: config
        });

        this.group.add(wrapperGroup);
    }

    createEdgeLines() {
        const hw = this.width / 2;
        const hh = this.height / 2;
        const hd = this.depth / 2;

        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        this.edgeLines = new THREE.LineSegments(edges, lineMaterial);
        this.edgeLines.visible = this.unfoldProgress === 0;
        this.group.add(this.edgeLines);
    }

    createVertexPoints() {
        const hw = this.width / 2;
        const hh = this.height / 2;
        const hd = this.depth / 2;

        const vertices = [
            [-hw, -hh, -hd], [hw, -hh, -hd],
            [-hw, hh, -hd], [hw, hh, -hd],
            [-hw, -hh, hd], [hw, -hh, hd],
            [-hw, hh, hd], [hw, hh, hd]
        ];

        const pointGeometry = new THREE.SphereGeometry(0.08, 16, 16);
        const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff4444 });

        vertices.forEach(pos => {
            const point = new THREE.Mesh(pointGeometry, pointMaterial);
            point.position.set(pos[0], pos[1], pos[2]);
            this.vertexPoints.push(point);
            this.group.add(point);
        });
    }

    createUnitCubes() {
        const unitSize = 0.5;
        const unitGeometry = new THREE.BoxGeometry(unitSize * 0.9, unitSize * 0.9, unitSize * 0.9);
        const unitMaterial = new THREE.MeshPhongMaterial({
            color: 0x22d3ee,
            transparent: true,
            opacity: 0.6
        });
        const unitEdges = new THREE.EdgesGeometry(unitGeometry);
        const unitLineMaterial = new THREE.LineBasicMaterial({ color: 0x06b6d4 });

        const countX = Math.floor(this.width / unitSize);
        const countY = Math.floor(this.height / unitSize);
        const countZ = Math.floor(this.depth / unitSize);

        for (let x = 0; x < countX; x++) {
            for (let y = 0; y < countY; y++) {
                for (let z = 0; z < countZ; z++) {
                    const unitCube = new THREE.Mesh(unitGeometry, unitMaterial);
                    unitCube.position.set(
                        -this.width / 2 + unitSize / 2 + x * unitSize,
                        -this.height / 2 + unitSize / 2 + y * unitSize,
                        -this.depth / 2 + unitSize / 2 + z * unitSize
                    );
                    this.group.add(unitCube);

                    const lines = new THREE.LineSegments(unitEdges, unitLineMaterial);
                    lines.position.copy(unitCube.position);
                    this.group.add(lines);
                }
            }
        }
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

        // Apply easing to the animation
        const easedProgress = Calculations.easing.easeInOutCubic(progress);

        // Animate each face
        this.faces.forEach(face => {
            const config = face.config;

            if (config.name === 'bottom') return;

            // Use easedProgress for smooth rotation
            let angle = config.unfoldAngle * easedProgress;

            if (config.unfoldAxis === 'x') {
                face.pivotGroup.rotation.x = angle;
            } else if (config.unfoldAxis === 'z') {
                face.pivotGroup.rotation.z = angle;
            }

            // Special handling for top face
            if (config.name === 'top') {
                const frontFace = this.faces.find(f => f.config.name === 'front');
                if (frontFace) {
                    const frontAngle = frontFace.pivotGroup.rotation.x;
                    // Calculate relative position based on Front face rotation
                    // New Position = Original Position + Rotation Vector
                    // DeltaY = h * (cos(angle) - 1)
                    // DeltaZ = h * sin(angle)
                    face.group.position.y = this.height * (Math.cos(frontAngle) - 1);
                    face.group.position.z = this.height * Math.sin(frontAngle);

                    face.pivotGroup.rotation.x = frontAngle + (Math.PI / 2 * easedProgress);
                }
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

    updateSize(dimension, value) {
        if (dimension === 'width') this.width = value;
        else if (dimension === 'height') this.height = value;
        else if (dimension === 'depth') this.depth = value;
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

    toggleUnitCubes() {
        this.showUnitCubes = !this.showUnitCubes;
        this.createShape();
        return this.showUnitCubes;
    }

    getStats() {
        const calc = Calculations.rectangularPrism;
        return {
            vertices: calc.vertices,
            edges: calc.edges,
            faces: calc.faces,
            volume: Calculations.formatNumber(calc.volume(this.width, this.height, this.depth)),
            area: Calculations.formatNumber(calc.surfaceArea(this.width, this.height, this.depth))
        };
    }

    getControls() {
        return [
            {
                id: 'width',
                label: 'CHIỀU DÀI',
                min: 1,
                max: 6,
                step: 0.1,
                value: this.width,
                unit: ''
            },
            {
                id: 'height',
                label: 'CHIỀU RỘNG',
                min: 1,
                max: 6,
                step: 0.1,
                value: this.height,
                unit: ''
            },
            {
                id: 'depth',
                label: 'CHIỀU CAO',
                min: 1,
                max: 6,
                step: 0.1,
                value: this.depth,
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
        if (id === 'width') {
            this.updateSize('width', parseFloat(value));
        } else if (id === 'height') {
            this.updateSize('height', parseFloat(value));
        } else if (id === 'depth') {
            this.updateSize('depth', parseFloat(value));
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
