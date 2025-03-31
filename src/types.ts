export interface InputObj {
  name: string;
  dataId: string;
  ariaLabel: string;
  xfaOn?: string;
  options?: Array<{ label: string; value: string }>;
  value?: string;
  textContent?: string;
}

export interface XfaNode {
  name: string;
  value?: string;
  attributes: {
    dataId: string;
    'aria-label': string;
    xfaOn?: string;
    value?: string;
    textContent?: string;
  };
  children?: XfaNode[];
}

export interface AcroNode {
  type: string;
  id: string;
  name: string;
}
