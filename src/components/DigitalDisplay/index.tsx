import { useRef } from 'react';
import classNames from 'classnames';

import styles from './index.module.css';


type Props = {
  isAlert?: boolean;
  isReadonly?: boolean;
  minutes: string;
  onMinutesChange: React.ChangeEventHandler<HTMLInputElement>;
  onSecondsChange: React.ChangeEventHandler<HTMLInputElement>;
  seconds: string;
  style?: React.StyleHTMLAttributes<SVGElement>;
}

function DigitalDisplay({
  isAlert = false,
  isReadonly = false,
  minutes,
  onMinutesChange,
  onSecondsChange,
  seconds,
  ...otherProps
}: Props) {
  const minuteInputRef = useRef<HTMLInputElement>(null);
  const secondsInputRef = useRef<HTMLInputElement>(null);

  const inputClassNames = classNames(
    "inline-block flex-1 text-center w-8 outline-none",
    styles.noSpinner
  );

  return (
    <div
      className={classNames(
        'flex content-center font-mono text-[5em] font-bold relative text-center w-full md:text-[8em]',
        isReadonly && 'opacity-50',
        isAlert && classNames(styles.blink, 'text-primary opacity-100'),
      )}
      {...otherProps}
    >
      <input
        className={classNames(inputClassNames, 'text-right')}
        min="0"
        readOnly={isReadonly}
        ref={minuteInputRef}
        type="number"
        value={minutes}
        onKeyDown={({ key }) => {
          if (minuteInputRef.current && key === ':') {
            minuteInputRef.current.focus();
          }
        }}
        onChange={onMinutesChange}
      />
      <div
        className={styles.separator}
      >
        {' : '}
      </div>
      <input
        className={classNames(inputClassNames, 'text-left')}
        max="60"
        min="0"
        onChange={onSecondsChange}
        readOnly={isReadonly}
        ref={secondsInputRef}
        type="number"
        value={seconds}
      />
    </div>
  );
}

export default DigitalDisplay;
