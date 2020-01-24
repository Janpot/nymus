export declare function copyRecursive(src: string, dest: string): Promise<void>;
export declare function rmDirRecursive(src: string): Promise<void>;
export declare function fileExists(src: string): Promise<boolean>;
interface TmpDir {
    path: string;
    cleanup: () => void;
}
export declare function tmpDirFromTemplate(templayePath: string): Promise<TmpDir>;
export {};
