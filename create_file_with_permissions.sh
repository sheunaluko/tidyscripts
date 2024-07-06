#!/bin/bash
umask 000
touch "$1"
chmod o+rw "$1"
