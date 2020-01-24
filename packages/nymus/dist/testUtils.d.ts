import { CreateModuleOptions } from './index';
import * as React from 'react';
export declare function createComponent(message: string, options?: CreateModuleOptions, intlMock?: any): Promise<React.FunctionComponent<any>>;
export declare function render(elm: React.FunctionComponent<any>, props?: {}): string;
