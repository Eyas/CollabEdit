
interface Rangy {
    createCssClassApplier(
        theclass: string,
        options?: any,
        tagNames?: string[]): ClassApplier;
}

interface ClassApplier {
    applyToSelection(win?: Window): void;
    undoToSelection(win?: Window): void;
    isAppliedToSelection(win?: Window): boolean;
    toggleSelection(win?: Window): void;

    applyToRange(range: RangyRange): void;
    undoToRange(range: RangyRange): void;
    isAppliedToRange(range: RangyRange): boolean;
    toggleRange(range: RangyRange): void;
}
