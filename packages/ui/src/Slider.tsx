import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import styled from 'styled-components'
import { focusRing } from './internal/mixins'

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {}

const StyledSlider = styled.input`
  appearance: none;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  height: 1.5rem;
  margin: 0;
  background: transparent;
  cursor: pointer;

  &::-webkit-slider-runnable-track {
    height: 0.35rem;
    border-radius: 999px;
    background: var(--foot-color-border);
  }

  &::-moz-range-track {
    height: 0.35rem;
    border-radius: 999px;
    background: var(--foot-color-border);
  }

  &::-webkit-slider-thumb {
    appearance: none;
    margin-top: -0.475rem;
    width: 1.3rem;
    height: 1.3rem;
    border-radius: 999px;
    background: var(--foot-color-primary);
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(11, 31, 46, 0.3);
    cursor: pointer;
    transition: transform 0.15s ease;
  }

  &::-moz-range-thumb {
    width: 1.3rem;
    height: 1.3rem;
    border-radius: 999px;
    background: var(--foot-color-primary);
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(11, 31, 46, 0.3);
    cursor: pointer;
  }

  &:hover::-webkit-slider-thumb {
    transform: scale(1.08);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  ${focusRing}

  @media (prefers-reduced-motion: reduce) {
    &::-webkit-slider-thumb {
      transition-duration: 0.001ms;
    }
  }
`

export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(props, ref) {
  return <StyledSlider ref={ref} type="range" {...props} />
})
