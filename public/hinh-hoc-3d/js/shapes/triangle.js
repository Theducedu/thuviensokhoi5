/**
 * TriangleShape - Hình tam giác đều
 */

class TriangleShape {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.side = 3; // Cạnh a

        this.mesh = null;
        this.edgeLine = null;

        this.createShape();
        this.scene.add(this.group);
    }

    createShape() {
        // Clear existing
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }

        // Calculate height
        const h = (this.side * Math.sqrt(3)) / 2;

        // Create Shape
        const shape = new THREE.Shape();
        // Centered at (0,0) looks better
        // Vertices: bottom-left (-a/2, -h/2), bottom-right (a/2, -h/2), top (0, h/2)
        shape.moveTo(-this.side / 2, -h / 2);
        shape.lineTo(this.side / 2, -h / 2);
        shape.lineTo(0, h / 2);
        shape.lineTo(-this.side / 2, -h / 2);

        // Geometry
        const geometry = new THREE.ShapeGeometry(shape);
        geometry.rotateX(-Math.PI / 2); // Lay flat on XZ plane

        // Material
        const material = new THREE.MeshPhongMaterial({
            color: 0xffeb3b,
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
        if (params.side) this.side = params.side;
        this.createShape();
    }

    getStats() {
        const calc = Calculations.triangle;
        return {
            volume: '---', // Không có thể tích
            area: Calculations.formatNumber(calc.area(this.side)),
            perimeter: Calculations.formatNumber(calc.perimeter(this.side))
        };
    }

    getControls() {
        return [
            {
                id: 'side',
                label: 'CẠNH (a)',
                min: 1,
                max: 10,
                step: 0.1,
                value: this.side,
                unit: 'cm'
            }
        ];
    }

    handleControl(id, value) {
        if (id === 'side') {
            this.updateParams({ side: parseFloat(value) });
        }
    }

    dispose() {
        this.scene.remove(this.group);
        // Dispose geometries/materials...
    }
}
