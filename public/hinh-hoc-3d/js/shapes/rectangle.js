/**
 * RectangleShape - Hình chữ nhật
 */

class RectangleShape {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.width = 4;  // Chiều dài
        this.height = 3; // Chiều rộng (trong 3D là depth)

        this.mesh = null;
        this.edgeLine = null;

        this.createShape();
        this.scene.add(this.group);
    }

    createShape() {
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }

        // Geometry (PlaneGeometry is on XY, need rotate to XZ)
        const geometry = new THREE.PlaneGeometry(this.width, this.height);
        geometry.rotateX(-Math.PI / 2);

        // Material
        const material = new THREE.MeshPhongMaterial({
            color: 0x4caf50,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.group.add(this.mesh);

        // Edges
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        this.edgeLine = new THREE.LineSegments(edges, lineMaterial);
        this.group.add(this.edgeLine);
    }

    updateParams(params) {
        if (params.width) this.width = params.width;
        if (params.height) this.height = params.height;
        this.createShape();
    }

    getStats() {
        const calc = Calculations.rectangle;
        return {
            volume: '---',
            area: Calculations.formatNumber(calc.area(this.width, this.height)),
            perimeter: Calculations.formatNumber(calc.perimeter(this.width, this.height))
        };
    }

    getControls() {
        return [
            {
                id: 'width',
                label: 'CHIỀU DÀI',
                min: 1,
                max: 10,
                step: 0.1,
                value: this.width,
                unit: 'cm'
            },
            {
                id: 'height',
                label: 'CHIỀU RỘNG',
                min: 1,
                max: 10,
                step: 0.1,
                value: this.height,
                unit: 'cm'
            }
        ];
    }

    handleControl(id, value) {
        if (id === 'width') {
            this.updateParams({ width: parseFloat(value) });
        } else if (id === 'height') {
            this.updateParams({ height: parseFloat(value) });
        }
    }

    dispose() {
        this.scene.remove(this.group);
    }
}
