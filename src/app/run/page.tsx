"use client"

import { useEffect, useRef, useState } from 'react';

import { prefixZeros, getSecondsDuration, getMinutesSeconds } from '@/src/utils/timeInputHelpers';
import useAnimationFrame from '@/src/utils/useAnimationFrame';
import useGlobalKeyUp from '@/src/utils/useGlobalKeyUp';
import useSound from '@/src/utils/useSound';
// import beep from '@/src/utils/beep';

import EditableHtml from '@/src/components/EditableHtml';
import Pie from '@/src/components/Pie';
import DigitalDisplay from '@/src/components/DigitalDisplay';

import styles from './page.module.scss';

function Timer() {
  // const [searchParams, setSearchParams] = useSearchParams();
  // const searchParamsObject = Object.fromEntries(searchParams);

  const sound = useSound();

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const isTimedOutRef = useRef(false);
  const isStarted = (elapsedTime > 0);

  const {
    m: totalMinutes = '01',
    s: totalSeconds = '00',
    title = '',
  } = {}; // searchParamsObject;

  useEffect(() => {
    // initially set params
    // setSearchParams({
    //   m: totalMinutes,
    //   s: totalSeconds,
    //   title,
    // });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalDuration = getSecondsDuration(totalMinutes, totalSeconds);
  const remainingSecondsRef = useRef(totalDuration);

  const elapsedPercentage = (elapsedTime) / totalDuration;
  const isTimedOut = (elapsedPercentage >= 1);

  if (isTimedOut && !isTimedOutRef.current) {
    sound.play();
  }
  isTimedOutRef.current = isTimedOut;

  const [minutes = totalMinutes, seconds = totalSeconds] = (isStarted) ? getMinutesSeconds(
    totalDuration * (1 - elapsedPercentage),
    10,
  ) : [];

  useAnimationFrame(
    (deltaTime) => setElapsedTime((prevState) => prevState + deltaTime / 1000),
    { isPaused },
  );

  const resetTimer = () => {
    remainingSecondsRef.current = totalDuration;
    setIsPaused(true);
    setElapsedTime(0);
  };

  const toggleTimer = () => {
    setIsPaused((prevState) => !prevState);
  };

  useGlobalKeyUp((event: KeyboardEvent) => {
    const target = event.target as any;
    if (target && target.tagName === 'BUTTON') {
      return;
    }
    switch (event.key) {
      case "r":
      case "Escape":
        resetTimer();
        break;
      case "Enter":
      case " ":
      case "p":
        if (!isTimedOut) {
          toggleTimer();
        }
        break;
    }
  });

  return (
    <div
      className={styles.container}
    >
      <EditableHtml
        html={title}
        // onChange={(value) => setSearchParams({
        //   ...searchParamsObject,
        //   title: value,
        // })}
        onChange={(value) => {}}
        className={styles.title}
        title="Click to edit title"
      />
      <div
        className={styles.pieContainer}
      >
        <Pie
          percentage={elapsedPercentage > 1 ? 0 : 100 * (1 - elapsedPercentage)}
        />

        <div
          className={styles.centerContainer}
        >
          <DigitalDisplay
            isAlert={isTimedOut}
            isReadonly={isStarted}
            minutes={minutes}
            seconds={seconds}
            onMinutesChange={({ target }) => {}}
            onSecondsChange={({ target }) => {}}
            // onMinutesChange={({ target }) => setSearchParams({
            //   ...searchParamsObject,
            //   m: prefixZeros(target.value),
            // })}
            // onSecondsChange={({ target }) => setSearchParams({
            //   ...searchParamsObject,
            //   s: prefixZeros(target.value),
            // })}
          />
          <div
            className={styles.controlsContainer}
          >
            <button
              disabled={isTimedOut}
              onClick={toggleTimer}
            >
              {isPaused ? 'START' : 'PAUSE'}
            </button>
            <button
              disabled={!isStarted}
              onClick={resetTimer}
            >
              RESET
            </button>
          </div>
          <a className={styles.by} href='https://www.mkrz.at/'>by mkrz</a>
        </div>
      </div>
    </div>
  );
}

export default Timer;
