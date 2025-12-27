"use client"

import { useEffect, useRef, useState } from 'react';

import { prefixZeros, getSecondsDuration, getMinutesSeconds } from '@/utils/timeInputHelpers';
import useAnimationFrame from '@/utils/useAnimationFrame';
import useGlobalKeyUp from '@/utils/useGlobalKeyUp';
import useParams from '@/utils/useParams';
import useSound from '@/utils/useSound';
// import beep from '@/utils/beep';

import EditableHtml from '@/components/EditableHtml';
import Pie from '@/components/Pie';
import DigitalDisplay from '@/components/DigitalDisplay';

function Timer() {
  const { params, setParams } = useParams();

  const sound = useSound();

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const isTimedOutRef = useRef(false);
  const isStarted = (elapsedTime > 0);

  useEffect(() => {
    // initially set params
    setParams({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalDuration = getSecondsDuration(params.m, params.s);
  const remainingSecondsRef = useRef(totalDuration);

  const elapsedPercentage = (elapsedTime) / totalDuration;
  const isTimedOut = (elapsedPercentage >= 1);

  if (isTimedOut && !isTimedOutRef.current) {
    sound?.play();
  }
  isTimedOutRef.current = isTimedOut;

  const [minutes = params.m, seconds = params.s] = (isStarted) ? getMinutesSeconds(
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
    const target = event.target;
    if (target instanceof HTMLElement && target.tagName === 'BUTTON') {
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

  const buttonClassName = 'bg-foreground disabled:opacity-50 text-background cursor-pointer disabled:cursor-default '
    + 'px-2 mx-1 rounded-sm hover:outline-secondary hover:outline-2 hover:outline-offset-2';

  return (
    <div
      className="flex flex-col h-full hugo"
    >
      <EditableHtml
        html={params.title}
        onChange={(value) => setParams({'title': value})}
        className="text-center text-[3em] font-bold pt-1 hover:outline-4 hover:-outline-offset-4 md:text-[5em] rouded-lg"
        title="Click to edit title"
      />
      <div
        className="flex items-center justify-center grow h-[10em] p-[1em] relative"
      >
        <Pie
          percentage={elapsedPercentage > 1 ? 0 : 100 * (1 - elapsedPercentage)}
        />

        <div
          className="flex flex-col items-center justify-center grow absolute inset-0"
        >
          <DigitalDisplay
            isAlert={isTimedOut}
            isReadonly={isStarted}
            minutes={minutes}
            seconds={seconds}
            onMinutesChange={({ target }) => setParams({'m': prefixZeros(target.value)})}
            onSecondsChange={({ target }) => setParams({'s': prefixZeros(target.value)})}
          />
          <div
            className="text-center py-[0.5em]"
          >
            <button
              className={buttonClassName}
              disabled={isTimedOut}
              onClick={toggleTimer}
              >
              {isPaused ? 'START' : 'PAUSE'}
            </button>
            <button
              className={buttonClassName}
              disabled={!isStarted}
              onClick={resetTimer}
            >
              RESET
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Timer;
