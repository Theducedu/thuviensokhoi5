/**
 * Cube Shape - Hình lập phương (Với tính năng trải hình)
 */

class CubeShape {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.size = 3;
        this.opacity = 0.8;
        this.unfoldProgress = 0;

        // Store references for visibility control
        this.vertexPoints = [];
        this.faces = [];
        this.edgeLines = null;
        this.mesh = null;

        this.createShape();
        this.scene.add(this.group);
    }

    createShape() {
        // Clear existing
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }
        this.vertexPoints = [];
        this.faces = [];

        const half = this.size / 2;

        // Create 6 separate faces for unfolding animation
        // Each face is a plane that can rotate independently
        const faceConfigs = [
            { // Bottom (đáy - cố định khi trải)
                vertices: [[-half, -half, -half], [half, -half, -half], [half, -half, half], [-half, -half, half]],
                color: 0x10b981,
                pivot: [0, -half, 0],
                unfoldRotation: { axis: 'x', angle: 0 },
                name: 'bottom'
            },
            { // Front  
                vertices: [[-half, -half, half], [half, -half, half], [half, half, half], [-half, half, half]],
                color: 0xf59e0b,
                pivot: [0, -half, half],
                unfoldRotation: { axis: 'x', angle: Math.PI / 2 },
                name: 'front'
            },
            { // Back
                vertices: [[half, -half, -half], [-half, -half, -half], [-half, half, -half], [half, half, -half]],
                color: 0xec4899,
                pivot: [0, -half, -half],
                unfoldRotation: { axis: 'x', angle: -Math.PI / 2 },
                name: 'back'
            },
            { // Left
                vertices: [[-half, -half, -half], [-half, -half, half], [-half, half, half], [-half, half, -half]],
                color: 0x8b5cf6,
                pivot: [-half, -half, 0],
                unfoldRotation: { axis: 'z', angle: Math.PI / 2 },
                name: 'left'
            },
            { // Right
                vertices: [[half, -half, half], [half, -half, -half], [half, half, -half], [half, half, half]],
                color: 0x6366f1,
                pivot: [half, -half, 0],
                unfoldRotation: { axis: 'z', angle: -Math.PI / 2 },
                name: 'right'
            },
            { // Top (mở từ front)
                vertices: [[-half, half, -half], [half, half, -half], [half, half, half], [-half, half, half]],
                color: 0x06b6d4,
                pivot: [0, half, half],
                unfoldRotation: { axis: 'x', angle: Math.PI },
                parentFace: 'front',
                name: 'top'
            }
        ];

        faceConfigs.forEach((config, index) => {
            const face = this.createFace(config, index);
            this.faces.push(face);
            this.group.add(face.group);
        });

        // Create edge lines
        this.createEdgeLines();

        // Create vertex points
        this.createVertexPoints();

        // Apply current unfold progress
        this.setUnfoldProgress(this.unfoldProgress);
    }

    createFace(config, index) {
        const geometry = new THREE.BufferGeometry();

        // Create vertices for a quad (2 triangles)
        const v = config.vertices;
        const positions = new Float32Array([
            // Triangle 1
            v[0][0], v[0][1], v[0][2],
            v[1][0], v[1][1], v[1][2],
            v[2][0], v[2][1], v[2][2],
            // Triangle 2
            v[0][0], v[0][1], v[0][2],
            v[2][0], v[2][1], v[2][2],
            v[3][0], v[3][1], v[3][2]
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

        // Create a group for pivot rotation
        const pivotGroup = new THREE.Group();
        pivotGroup.position.set(config.pivot[0], config.pivot[1], config.pivot[2]);

        // Offset mesh to rotate around pivot
        mesh.position.set(-config.pivot[0], -config.pivot[1], -config.pivot[2]);
        pivotGroup.add(mesh);

        // Create edge outline for this face
        const edgeGeometry = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const edgeLine = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        edgeLine.position.copy(mesh.position);
        pivotGroup.add(edgeLine);

        // Wrapper group to handle parent relationships
        const wrapperGroup = new THREE.Group();
        wrapperGroup.add(pivotGroup);

        return {
            group: wrapperGroup,
            pivotGroup: pivotGroup,
            mesh: mesh,
            edgeLine: edgeLine,
            config: config,
            originalRotation: { x: 0, y: 0, z: 0 }
        };
    }

    createEdgeLines() {
        // Main cube edges (shown when not unfolded)
        const geometry = new THREE.BoxGeometry(this.size, this.size, this.size);
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        this.edgeLines = new THREE.LineSegments(edges, lineMaterial);
        this.edgeLines.visible = this.unfoldProgress === 0;
        this.group.add(this.edgeLines);
    }

    createVertexPoints() {
        const half = this.size / 2;
        const vertices = [
            [-half, -half, -half], [half, -half, -half],
            [-half, half, -half], [half, half, -half],
            [-half, -half, half], [half, -half, half],
            [-half, half, half], [half, half, half]
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

    updateSize(size) {
        this.size = size;
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

    setVisibility(options) {
        // Toggle vertices
        this.vertexPoints.forEach(point => {
            point.visible = options.vertices;
        });

        // Toggle edges
        if (this.edgeLines) {
            this.edgeLines.visible = options.edges && this.unfoldProgress === 0;
        }
        this.faces.forEach(face => {
            if (face.edgeLine) {
                face.edgeLine.visible = options.edges;
            }
        });

        // Toggle faces
        this.faces.forEach(face => {
            if (face.mesh) {
                face.mesh.visible = options.faces;
            }
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

        // Apply easing to the animation
        const easedProgress = Calculations.easing.easeInOutCubic(progress);

        // Animate each face
        this.faces.forEach(face => {
            const config = face.config;

            if (config.name === 'bottom') {
                // Bottom stays fixed
                return;
            }

            let angle = 0;
            if (config.unfoldRotation.axis === 'x') {
                angle = config.unfoldRotation.angle * easedProgress;
                face.pivotGroup.rotation.x = angle;
            } else if (config.unfoldRotation.axis === 'z') {
                angle = config.unfoldRotation.angle * easedProgress;
                face.pivotGroup.rotation.z = angle;
            }

            // Special handling for top face (it should open after front opens)
            if (config.name === 'top') {
                const frontFace = this.faces.find(f => f.config.name === 'front');
                if (frontFace) {
                    // Top follows front's rotation plus its own
                    const frontAngle = frontFace.pivotGroup.rotation.x;
                    // Position top relative to unfolded front
                    // DeltaY = s * (cos(angle) - 1)
                    // DeltaZ = s * sin(angle)
                    face.group.position.y = this.size * (Math.cos(frontAngle) - 1);
                    face.group.position.z = this.size * Math.sin(frontAngle);

                    // Rotate top as front unfolds
                    face.pivotGroup.rotation.x = frontAngle + (Math.PI / 2 * easedProgress);
                }
            }
        });
    }

    getStats() {
        const calc = Calculations.cube;
        return {
            vertices: calc.vertices,
            edges: calc.edges,
            faces: calc.faces,
            volume: Calculations.formatNumber(calc.volume(this.size)),
            area: Calculations.formatNumber(calc.surfaceArea(this.size))
        };
    }

    getControls() {
        return [
            {
                id: 'size',
                label: 'DÀI / CẠNH',
                min: 1,
                max: 6,
                step: 0.1,
                value: this.size,
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
        if (id === 'size') {
            this.updateSize(parseFloat(value));
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
