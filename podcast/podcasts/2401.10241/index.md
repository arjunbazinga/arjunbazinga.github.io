---
title: Zero Bubble Pipeline Parallelism
categories: [  Deep Learning, Performance, Systems, Throughput ]
date: "2024-07-08"
arxiv-paper-id: "2401.10241"
---

Core idea is think about backward pass into two flows, one to compute grad wrt to parameters, and one to compute grad wrt to output of last layer, 
schedule so that you are always working instead of waiting (bubble).

