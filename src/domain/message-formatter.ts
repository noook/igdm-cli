export default class MessageFormatter {
  public static maxLength(text: string, lineLength: number) {
    const paragraphs = text.split('\n');
    const chunks = paragraphs
      .map(paragraph => {
        return paragraph
          .split(' ')
          .reduce<string[][]>((acc, word) => {
            const row = acc.pop()!;
            if (`${row.join(' ')} ${word}`.length < lineLength) {
              row.push(word);
              acc.push(row);
            } else {
              acc.push(row, [word]);
            }
            
            return acc;
          }, [[]])
          .map(row => row.join(' '))
          .join('\n');
      });

    return chunks.join('\n');
  }
}