import ContentEditable from 'react-contenteditable';
import sanitizeHtml from 'sanitize-html';

const sanitizeConf = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'br', 'p'],
  allowedAttributes: { a: ['href'] },
};

export default function EditableHtml({
  html,
  onChange,
  ...otherProps
}: {
  html: string;
  onChange: (value: string) => void;
  className?: string;
  tagName?: string;
  title?: string;
}) {
  return (
    <ContentEditable
      tagName="div"
      html={sanitizeHtml(html, sanitizeConf)}
      onChange={({ target }: React.ChangeEvent<{ value: string; }>) => onChange(sanitizeHtml(target.value, sanitizeConf))}
      onKeyDown={( event: React.KeyboardEvent<EventTarget> ) => event.stopPropagation()}
      onKeyUp={(event: React.KeyboardEvent<EventTarget>) => event.stopPropagation()}
      {...otherProps}
    />
  );
}
