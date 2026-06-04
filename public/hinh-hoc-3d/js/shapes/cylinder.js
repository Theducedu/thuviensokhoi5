/**
 * Cylinder Shape - Hình trụ (Version 3 - Simple Direct Approach)
 * Khai triển: HCN nằm ngang + 2 hình tròn ở giữa cạnh trên/dưới
 */

class CylinderShape {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.radius = 2;
        this.height = 4;
        this.opacity = 0.8;
        this.unfoldProgress = 0;

        this.createShape();
        this.scene.add(this.group);
    }

    createShape() {
        // Clear existing
        while (this.group.children.length > 0) {
            const child = this.group.children[0];
            this.group.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }

        // Tạo hình trụ 3D (khi đóng)
        this.createSolidCylinder();

        // Tạo các phần khai triển (khi mở)
        this.createUnfoldMeshes();

        this.setUnfoldProgress(this.unfoldProgress);
    }

    createSolidCylinder() {
        this.solidGroup = new THREE.Group();

        // Thân trụ
        const bodyGeo = new THREE.CylinderGeometry(this.radius, this.radius, this.height, 64);
        const bodyMat = new THREE.MeshPhongMaterial({
            color: 0xffdd00,
            transparent: true,
            opacity: this.opacity,
            side: THREE.DoubleSide
        });
        this.solidGroup.add(new THREE.Mesh(bodyGeo, bodyMat));

        // Viền
        const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff });
        this.solidGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), edgeMat));

        // Nắp trên
        const capGeo = new THREE.CircleGeometry(this.radius, 64);
        const capMat = new THREE.MeshPhongMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: this.opacity,
            side: THREE.DoubleSide
        });
        const topCap = new THREE.Mesh(capGeo, capMat);
        topCap.position.y = this.height / 2;
        topCap.rotation.x = -Math.PI / 2;
        this.solidGroup.add(topCap);

        // Nắp dưới
        const bottomCap = new THREE.Mesh(capGeo.clone(), capMat.clone());
        bottomCap.position.y = -this.height / 2;
        bottomCap.rotation.x = Math.PI / 2;
        this.solidGroup.add(bottomCap);

        // Trục và bán kính helpers
        const axisPoints = [
            new THREE.Vector3(0, -this.height / 2, 0),
            new THREE.Vector3(0, this.height / 2, 0)
        ];
        const axisMat = new THREE.LineDashedMaterial({ color: 0xff4444, dashSize: 0.2, gapSize: 0.1 });
        const axisLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(axisPoints), axisMat);
        axisLine.computeLineDistances();
        this.solidGroup.add(axisLine);

        this.group.add(this.solidGroup);
    }

    createUnfoldMeshes() {
        this.unfoldGroup = new THREE.Group();

        const circumference = 2 * Math.PI * this.radius;

        // === THÂN (HCN) ===
        const bodyGeo = new THREE.PlaneGeometry(circumference, this.height);
        const bodyMat = new THREE.MeshPhongMaterial({
            color: 0xffdd00,
            transparent: true,
            opacity: this.opacity,
            side: THREE.DoubleSide
        });
        this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        this.unfoldGroup.add(this.bodyMesh);

        // Viền thân
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x0000ff });
        this.bodyEdges = new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), edgeMat);
        this.unfoldGroup.add(this.bodyEdges);

        // === NẮP TRÊN ===
        const capGeo = new THREE.CircleGeometry(this.radius, 64);
        const capMat = new THREE.MeshPhongMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: this.opacity,
            side: THREE.DoubleSide
        });
        this.topCapMesh = new THREE.Mesh(capGeo, capMat);
        this.unfoldGroup.add(this.topCapMesh);

        // Viền nắp trên
        const capEdgeGeo = new THREE.BufferGeometry().setFromPoints(
            new THREE.Path().absarc(0, 0, this.radius, 0, Math.PI * 2).getPoints(64)
        );
        this.topCapEdge = new THREE.LineLoop(capEdgeGeo, edgeMat.clone());
        this.unfoldGroup.add(this.topCapEdge);

        // === NẮP DƯỚI ===
        this.bottomCapMesh = new THREE.Mesh(capGeo.clone(), capMat.clone());
        this.unfoldGroup.add(this.bottomCapMesh);

        this.bottomCapEdge = new THREE.LineLoop(capEdgeGeo.clone(), edgeMat.clone());
        this.unfoldGroup.add(this.bottomCapEdge);

        this.group.add(this.unfoldGroup);
    }

    setUnfoldProgress(progress) {
        this.unfoldProgress = progress;

        const isClosed = progress < 0.01;

        // Toggle visibility
        if (this.solidGroup) this.solidGroup.visible = isClosed;
        if (this.unfoldGroup) this.unfoldGroup.visible = !isClosed;

        if (!isClosed) {
            this.updateUnfoldAnimation(progress);
        }
    }

    updateUnfoldAnimation(progress) {
        // Chia animation thành 2 giai đoạn:
        // 0-50%: Thân trải từ bọc sang phẳng
        // 50-100%: Nắp mở ra

        let bodyProgress = Math.min(progress / 0.5, 1);
        let capProgress = Math.max((progress - 0.5) / 0.5, 0);

        const easedBody = Calculations.easing.easeInOutCubic(bodyProgress);
        const easedCap = Calculations.easing.easeOutCubic(capProgress);

        // === TRẠNG THÁI CUỐI (100% mở) ===
        // - Thân: nằm phẳng trên mặt đất (Y = 0), rotation X = -90°
        // - Nắp trên: phía sau thân (Z = -height/2 - radius), nằm phẳng
        // - Nắp dưới: phía trước thân (Z = +height/2 + radius), nằm phẳng

        // === THÂN ===
        // Từ đứng (rotation.x = 0) sang nằm (rotation.x = -PI/2)
        this.bodyMesh.rotation.x = -Math.PI / 2 * easedBody;
        this.bodyEdges.rotation.x = -Math.PI / 2 * easedBody;

        // Vị trí: Y giảm từ 0 về -height/2 (để tâm HCN nằm trên mặt đất)
        // Thực ra khi xoay -90°, tâm sẽ vẫn ở tâm, không cần dịch Y
        this.bodyMesh.position.y = 0;
        this.bodyEdges.position.y = 0;

        // === NẮP TRÊN ===
        // Giai đoạn 1 (0-50%): Nắp di chuyển từ đỉnh trụ về cạnh sau của thân
        // Giai đoạn 2 (50-100%): Nắp xoay từ đứng sang nằm

        // Vị trí ban đầu (trụ đóng): Y = height/2, Z = 0
        // Vị trí giai đoạn 1 kết thúc: Y = 0, Z = -height/2 (sát cạnh sau thân)
        // Vị trí giai đoạn 2 kết thúc: Y = 0, Z = -height/2 - radius (tâm dịch ra xa)

        const topCapY = this.height / 2 * (1 - easedBody);
        const topCapZ_phase1 = -this.height / 2 * easedBody;
        const topCapZ_phase2 = -this.radius * easedCap;
        const topCapZ = topCapZ_phase1 + topCapZ_phase2;

        this.topCapMesh.position.set(0, topCapY, topCapZ);
        this.topCapEdge.position.set(0, topCapY, topCapZ);

        // Xoay nắp trên:
        // Ban đầu: rotation.x = -PI/2 (nằm ngang úp xuống thân trụ)
        // Giai đoạn 1: xoay theo thân từ -PI/2 về 0 (đứng thẳng)
        // Giai đoạn 2: xoay từ 0 về -PI/2 (nằm phẳng trên mặt đất, hướng lên)
        const topCapRotX = -Math.PI / 2 * (1 - easedBody) + (-Math.PI / 2 * easedCap);
        this.topCapMesh.rotation.x = topCapRotX;
        this.topCapEdge.rotation.x = topCapRotX;

        // === NẮP DƯỚI ===
        // Vị trí ban đầu: Y = -height/2, Z = 0
        // Vị trí giai đoạn 1 kết thúc: Y = 0, Z = +height/2 (sát cạnh trước thân)
        // Vị trí giai đoạn 2 kết thúc: Y = 0, Z = +height/2 + radius

        const bottomCapY = -this.height / 2 * (1 - easedBody);
        const bottomCapZ_phase1 = this.height / 2 * easedBody;
        const bottomCapZ_phase2 = this.radius * easedCap;
        const bottomCapZ = bottomCapZ_phase1 + bottomCapZ_phase2;

        this.bottomCapMesh.position.set(0, bottomCapY, bottomCapZ);
        this.bottomCapEdge.position.set(0, bottomCapY, bottomCapZ);

        // Xoay nắp dưới:
        // Ban đầu: rotation.x = PI/2 (nằm ngang ngửa lên thân trụ)
        // Giai đoạn 1: xoay từ PI/2 về 0 (đứng thẳng)
        // Giai đoạn 2: xoay từ 0 về -PI/2 (nằm phẳng, hướng lên)
        const bottomCapRotX = Math.PI / 2 * (1 - easedBody) + (-Math.PI / 2 * easedCap);
        this.bottomCapMesh.rotation.x = bottomCapRotX;
        this.bottomCapEdge.rotation.x = bottomCapRotX;
    }

    updateSize(radius, height) {
        if (radius !== undefined) this.radius = radius;
        if (height !== undefined) this.height = height;
        this.createShape();
    }

    updateOpacity(opacity) {
        this.opacity = opacity;
        this.group.traverse(child => {
            if (child.material && child.material.opacity !== undefined) {
                child.material.opacity = opacity;
            }
        });
    }

    setVisibility(options) {
        // Can be extended
    }

    getStats() {
        const calc = Calculations.cylinder;
        return {
            radius: this.radius,
            height: this.height,
            volume: Calculations.formatNumber(calc.volume(this.radius, this.height)),
            lateralArea: Calculations.formatNumber(calc.lateralArea(this.radius, this.height)),
            totalArea: Calculations.formatNumber(calc.totalArea(this.radius, this.height))
        };
    }

    getControls() {
        return [
            {
                id: 'radius',
                label: 'BÁN KÍNH',
                min: 0.5,
                max: 4,
                step: 0.1,
                value: this.radius,
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
        if (id === 'radius') {
            this.updateSize(parseFloat(value), undefined);
        } else if (id === 'height') {
            this.updateSize(undefined, parseFloat(value));
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
