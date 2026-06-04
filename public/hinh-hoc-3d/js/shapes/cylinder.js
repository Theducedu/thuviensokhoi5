/**
 * Cylinder Shape.
 *
 * Ported from the standalone hinhtru3d source so the cylinder unfolds by
 * morphing the curved side into a rectangle and moving the two circular bases.
 */

class CylinderShape {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.radius = 2;
        this.height = 4;
        this.opacity = 0.8;
        this.unfoldProgress = 0;
        this.showVertices = true;
        this.showEdges = true;
        this.showFaces = true;

        this.bodyMesh = null;
        this.bodyWireframe = null;
        this.topCapGroup = null;
        this.bottomCapGroup = null;
        this.edgeObjects = [];
        this.vertexObjects = [];
        this.faceObjects = [];

        this.createShape();
        this.scene.add(this.group);
    }

    createShape() {
        while (this.group.children.length > 0) {
            const child = this.group.children[0];
            this.group.remove(child);
            this.disposeObject(child);
        }

        this.edgeObjects = [];
        this.vertexObjects = [];
        this.faceObjects = [];

        this.createBody();
        this.createCaps();
        this.createGuides();
        this.setUnfoldProgress(this.unfoldProgress);
        this.applyVisibility();
    }

    createBody() {
        const bodyGeometry = this.createLateralGeometry();
        const bodyMaterial = new THREE.MeshBasicMaterial({
            color: 0xffd54f,
            transparent: true,
            opacity: this.opacity,
            side: THREE.DoubleSide
        });

        this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.group.add(this.bodyMesh);
        this.faceObjects.push(this.bodyMesh);

        const wireMaterial = new THREE.MeshBasicMaterial({
            color: 0x42a5f5,
            wireframe: true,
            transparent: true,
            opacity: 0.45
        });
        this.bodyWireframe = new THREE.Mesh(bodyGeometry.clone(), wireMaterial);
        this.group.add(this.bodyWireframe);
        this.edgeObjects.push(this.bodyWireframe);
    }

    createLateralGeometry() {
        const progress = this.getBodyProgress();
        const circumference = this.getCircumference();
        const segmentsW = 64;
        const segmentsH = 1;
        const vertices = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        for (let j = 0; j <= segmentsH; j++) {
            const v = j / segmentsH;
            const y = this.height / 2 - v * this.height;

            for (let i = 0; i <= segmentsW; i++) {
                const t = i / segmentsW;
                const theta = (t - 0.5) * Math.PI * 2;

                const cylinderX = Math.sin(theta) * this.radius;
                const cylinderZ = Math.cos(theta) * this.radius;
                const flatX = (t - 0.5) * circumference;
                const flatZ = 0;

                vertices.push(
                    THREE.MathUtils.lerp(cylinderX, flatX, progress),
                    y,
                    THREE.MathUtils.lerp(cylinderZ, flatZ, progress)
                );
                normals.push(0, 0, 1);
                uvs.push(t, 1 - v);
            }
        }

        for (let j = 0; j < segmentsH; j++) {
            for (let i = 0; i < segmentsW; i++) {
                const a = j * (segmentsW + 1) + i;
                const b = a + 1;
                const c = (j + 1) * (segmentsW + 1) + i;
                const d = c + 1;
                indices.push(a, c, b, b, c, d);
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeBoundingSphere();
        return geometry;
    }

    createCaps() {
        this.topCapGroup = this.createCapGroup(true);
        this.bottomCapGroup = this.createCapGroup(false);
        this.group.add(this.topCapGroup);
        this.group.add(this.bottomCapGroup);
    }

    createCapGroup(isTop) {
        const capGroup = new THREE.Group();
        const capGeometry = new THREE.CircleGeometry(this.radius, 64);
        const capMaterial = new THREE.MeshStandardMaterial({
            color: 0xef5350,
            transparent: true,
            opacity: this.opacity,
            side: THREE.DoubleSide,
            metalness: 0.15,
            roughness: 0.45
        });

        const capMesh = new THREE.Mesh(capGeometry, capMaterial);
        capGroup.add(capMesh);
        this.faceObjects.push(capMesh);

        const ringGeometry = new THREE.RingGeometry(Math.max(this.radius - 0.035, 0.01), this.radius, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x42a5f5,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        const edgeRing = new THREE.Mesh(ringGeometry, ringMaterial);
        capGroup.add(edgeRing);
        this.edgeObjects.push(edgeRing);

        const centerPoint = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        capGroup.add(centerPoint);
        this.vertexObjects.push(centerPoint);

        const radiusLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0.03),
                new THREE.Vector3(this.radius, 0, 0.03)
            ]),
            new THREE.LineBasicMaterial({ color: 0xffffff })
        );
        capGroup.add(radiusLine);
        this.edgeObjects.push(radiusLine);

        capGroup.userData.isTop = isTop;
        return capGroup;
    }

    createGuides() {
        const axisLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, -this.height / 2, 0),
                new THREE.Vector3(0, this.height / 2, 0)
            ]),
            new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.2, gapSize: 0.12 })
        );
        axisLine.computeLineDistances();
        this.group.add(axisLine);
        this.edgeObjects.push(axisLine);

        this.heightLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(this.radius + 0.35, -this.height / 2, 0),
                new THREE.Vector3(this.radius + 0.35, this.height / 2, 0)
            ]),
            new THREE.LineBasicMaterial({ color: 0xffffff })
        );
        this.group.add(this.heightLine);
        this.edgeObjects.push(this.heightLine);
    }

    setUnfoldProgress(progress) {
        this.unfoldProgress = progress;

        this.updateBodyGeometry();
        this.updateCapTransform(this.topCapGroup, true);
        this.updateCapTransform(this.bottomCapGroup, false);
        this.updateHeightGuide();
        this.applyVisibility();
    }

    updateBodyGeometry() {
        if (!this.bodyMesh || !this.bodyWireframe) return;

        const bodyGeometry = this.createLateralGeometry();
        this.bodyMesh.geometry.dispose();
        this.bodyWireframe.geometry.dispose();
        this.bodyMesh.geometry = bodyGeometry;
        this.bodyWireframe.geometry = bodyGeometry.clone();
    }

    updateCapTransform(capGroup, isTop) {
        if (!capGroup) return;

        const capProgress = this.getCapProgress();
        const bodyProgress = this.getBodyProgress();
        const circumference = this.getCircumference();
        const yDirection = isTop ? 1 : -1;
        const closedY = yDirection * this.height / 2;
        const openY = yDirection * (this.height / 2 + this.radius);
        const flatY = isTop ? this.height / 2 + this.radius : -this.height / 2 - this.radius;

        const yAfterCap = THREE.MathUtils.lerp(closedY, openY, capProgress);
        const y = THREE.MathUtils.lerp(yAfterCap, flatY, bodyProgress);
        const z = THREE.MathUtils.lerp(0, 0.02, bodyProgress);

        capGroup.position.set(0, y, z);

        const closedRotation = isTop ? -Math.PI / 2 : Math.PI / 2;
        const rotationAfterCap = THREE.MathUtils.lerp(closedRotation, 0, capProgress);
        capGroup.rotation.x = THREE.MathUtils.lerp(rotationAfterCap, 0, bodyProgress);

        capGroup.position.x = 0;
        if (bodyProgress > 0.001) {
            capGroup.position.x = 0;
            capGroup.position.y = flatY;
            capGroup.position.z = 0.05;
        }

        if (this.unfoldProgress > 0.99) {
            capGroup.position.x = 0;
            capGroup.position.y = flatY;
            capGroup.position.z = 0.05;
        }

        capGroup.userData.circumference = circumference;
    }

    updateHeightGuide() {
        if (!this.heightLine) return;

        const bodyProgress = this.getBodyProgress();
        const closedX = this.radius + 0.35;
        const openX = this.getCircumference() / 2 + 0.45;
        const x = THREE.MathUtils.lerp(closedX, openX, bodyProgress);

        this.heightLine.geometry.dispose();
        this.heightLine.geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, -this.height / 2, 0.08),
            new THREE.Vector3(x, this.height / 2, 0.08)
        ]);
    }

    getCapProgress() {
        return Calculations.easing.easeInOutCubic(Math.min(this.unfoldProgress * 2, 1));
    }

    getBodyProgress() {
        return Calculations.easing.easeInOutCubic(Math.max((this.unfoldProgress - 0.5) * 2, 0));
    }

    getCircumference() {
        return 2 * Math.PI * this.radius;
    }

    updateSize(radius, height) {
        if (radius !== undefined) this.radius = radius;
        if (height !== undefined) this.height = height;
        this.createShape();
    }

    updateOpacity(opacity) {
        this.opacity = opacity;
        this.faceObjects.forEach((object) => {
            if (object.material && object.material.opacity !== undefined) {
                object.material.opacity = opacity;
            }
        });
    }

    setVisibility(options) {
        this.showVertices = options.vertices;
        this.showEdges = options.edges;
        this.showFaces = options.faces;
        this.applyVisibility();
    }

    applyVisibility() {
        this.faceObjects.forEach((object) => {
            object.visible = this.showFaces;
        });
        this.edgeObjects.forEach((object) => {
            object.visible = this.showEdges;
        });
        this.vertexObjects.forEach((object) => {
            object.visible = this.showVertices && this.unfoldProgress < 0.01;
        });
    }

    getStats() {
        const calc = Calculations.cylinder;
        return {
            vertices: calc.vertices,
            edges: calc.edges,
            faces: calc.faces,
            radius: this.radius,
            height: this.height,
            volume: Calculations.formatNumber(calc.volume(this.radius, this.height)),
            area: Calculations.formatNumber(calc.surfaceArea(this.radius, this.height)),
            lateralArea: Calculations.formatNumber(2 * Math.PI * this.radius * this.height)
        };
    }

    getControls() {
        return [
            {
                id: 'radius',
                label: 'BAN KINH',
                min: 0.5,
                max: 4,
                step: 0.1,
                value: this.radius,
                unit: ''
            },
            {
                id: 'height',
                label: 'CHIEU CAO',
                min: 1,
                max: 8,
                step: 0.1,
                value: this.height,
                unit: ''
            },
            {
                id: 'opacity',
                label: 'DO TRONG SUOT',
                min: 0.1,
                max: 1,
                step: 0.1,
                value: this.opacity,
                unit: ''
            }
        ];
    }

    handleControl(id, value) {
        if (id === 'radius') {
            this.updateSize(parseFloat(value), undefined);
        } else if (id === 'height') {
            this.updateSize(undefined, parseFloat(value));
        } else if (id === 'opacity') {
            this.updateOpacity(parseFloat(value));
        }
    }

    disposeObject(object) {
        object.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((material) => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }

    dispose() {
        this.scene.remove(this.group);
        this.disposeObject(this.group);
    }
}
