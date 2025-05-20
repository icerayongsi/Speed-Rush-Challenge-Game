#!/bin/bash

PIN=$2
CHIP="gpiochip0"

case "$1" in
  setup)
    echo "GPIO pin $PIN configured for input on $CHIP"
    ;;
  read)
    STATE=$(gpioget $CHIP $PIN)
    echo $STATE
    ;;
  *)
    echo "Usage: $0 {setup|read} <pin>"
    exit 1
    ;;
esac

exit 0
