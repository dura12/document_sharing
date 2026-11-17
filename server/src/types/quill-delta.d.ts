declare module "quill-delta" {
  export default class Delta {
    ops: any[];
    constructor(ops?: any[] | { ops: any[] });
    insert(text: any, attributes?: any): this;
    delete(length: number): this;
    retain(length: number, attributes?: any): this;
    compose(other: Delta): Delta;
  }
}
