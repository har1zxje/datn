import React from 'react';

const parseInlineMarkdown = (text, tone) => {
  const parts = [];
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(<strong key={`${token}-${match.index}`}>{token.slice(2, -2)}</strong>);
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        parts.push(
          <a
            key={`${token}-${match.index}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className={
              tone === 'user'
                ? 'font-semibold text-[oklch(0.998_0.006_150)] underline decoration-[oklch(0.998_0.006_150_/_0.65)] underline-offset-4'
                : 'font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-800'
            }
          >
            {linkMatch[1]}
          </a>
        );
      }
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : text;
};

const MarkdownMessage = ({ content, tone = 'assistant' }) => {
  const lines = String(content || '').split('\n');
  const blocks = [];
  let listItems = [];

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="my-2 list-disc space-y-1 pl-5">
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{parseInlineMarkdown(item, tone)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      return;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(line.slice(2));
      return;
    }

    flushList();
    blocks.push(
      <p key={`paragraph-${index}`} className="my-2 leading-relaxed">
        {parseInlineMarkdown(line, tone)}
      </p>
    );
  });

  flushList();

  return <div className="text-[13px] leading-relaxed">{blocks}</div>;
};

export default MarkdownMessage;
