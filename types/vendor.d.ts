declare module '*vendor/jquery.js' {
  const jq: typeof import('jquery');
  export default jq;
}

declare module '*vendor/handlebars.runtime.js' {
  import Handlebars from 'handlebars';
  export default Handlebars;
}
declare module '*vendor/change-case.js' {
  export * from 'change-case';
}

declare module '*vendor/html-entities/index.js' {
  export * from 'html-entities';
}

declare module '*vendor/datatables.js' {
  const d: any;
  export default d;
}

declare module '*vendor/fontawesome.js' {
  const d: any;
  export default d;
}

declare module '*vendor/debug.js' {
  import debug from 'debug';
  export default debug;
}
