import {Forest} from '@wonderlandlabs/forestry4';
import type {BoxCellType, RectPXType} from './types.js';
import {rectToAbsolute} from "./helpers.js";
import {ComputeAxis} from './ComputeAxis.js';

export class BoxStore extends Forest<BoxCellType> {
    update() {
        this.alignChildren();
    }

    get location(): RectPXType {
        const {dim, location} = this.value;
        return rectToAbsolute(dim ?? location);
    }

    alignChildren() {
        const {children, align} = this.value;
        if (!Array.isArray(children) || children.length === 0) {
            return;
        }

        const myContainer = this.location;
        if (!myContainer) {
            throw new Error('cannot align children: store location not set')
        }

        const childLocations: RectPXType[] = new ComputeAxis(
            align,
            myContainer,
            children.map((child) => child.dim),
        ).compute();

        this.mutate((draft) => {
            if (!Array.isArray(draft.children)) {
                return;
            }
            draft.children = draft.children.map((child: BoxCellType, index: number) => {
               const newChild = {
                    ...child,
                    location: childLocations[index],
                }
                if (Array.isArray(newChild.children) && newChild.children.length > 0) {
                    updateChildren(newChild);
                }
                return newChild;
            });
        });
    }
}

function updateChildren(cell: BoxCellType) {
    const {location: myContainer, children, align} = cell;
    if (!Array.isArray(children) || children.length === 0 || !myContainer) return;
    const childLocations: RectPXType[] = new ComputeAxis(
        align,
        myContainer,
        children.map((child) => child.dim),
    ).compute();
    cell.children = children.map((child: BoxCellType, index: number) => {
       const newChild = {
            ...child,
            location: childLocations[index],
        }
        if (Array.isArray(newChild.children) && newChild.children.length > 0) {
            updateChildren(newChild);
        }
        return newChild;
    })
}