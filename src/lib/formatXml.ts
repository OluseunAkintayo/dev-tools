// Format XML output for readability
export const formatXml = (xmlString: string) => {
  const PADDING = " ".repeat(2); // set desired indent size here
  const reg = /(>)(<)(\/*)/g;
  let formatted = "";
  let pad = 0;
  xmlString = xmlString.replace(reg, "$1\r\n$2$3");
  xmlString.split("\r\n").forEach((node) => {
    let indent = 0;
    if (node.match(/.+<\/\w[^>]*>$/)) {
      indent = 0;
    } else if (node.match(/^<\/\w/)) {
      if (pad !== 0) {
        pad -= 1;
      }
    } else if (node.match(/^<\w([^>]*[^/])?>.*$/)) {
      indent = 1;
    } else {
      indent = 0;
    }

    formatted += PADDING.repeat(pad) + node + "\r\n";
    pad += indent;
  });
  return formatted.trim();
};
