
interface RangyConfig {
}

interface RangyDom {
}

interface RangyFeatures {
}

interface RangyModule {
}

interface RangyUtil {
}

interface RangyRange {
}

interface RangyPureJSRange {
}

interface RangySelection {
}

interface Rangy {
    config: RangyConfig;
    dom: RangyDom;
    features: RangyFeatures;
    initialized: boolean;
    modules: RangyModule[];
    supported: boolean;
    util: RangyUtil;
    DomRange(doc: Document): RangyRange;
    Selection(selection: Selection): RangySelection;

    addInitListener(listener: Function): void;
    createMissingNativeApi(): void;
    createNativeRange(doc?: Document): TextRange;
    createRange(doc?: Document): RangyRange;
    createRangyRange(doc?: Document): RangyPureJSRange;
    getNativeSelection(win?: Window): Selection;
    getSelection(win?: Window): RangySelection;
    getIframeSelection(iframe: Element): RangySelection;

    init(): void;

    isSelectionValid(win?: Window): boolean;
}