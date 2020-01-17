import { SourceLocation } from '@babel/code-frame';

export default class IcurError extends Error {
  location: SourceLocation | null;
  constructor(message: string, location: SourceLocation | null) {
    super(message);
    this.location = location;
  }
}
