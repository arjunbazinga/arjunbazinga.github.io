---
title: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness"
categories: ['Deep Learning', 'Transformers', 'Systems and Performance']
date: 2024-07-19T22:17:53+0530
arxiv-paper-id: 2205.14135
---
FlashAttention is a novel algorithm that addresses the efficiency of Transformer models by improving speed and memory efficiency through IO-awareness. It reduces the number of memory accesses by dividing data into smaller blocks and loading them into fast memory, achieving practical speedups and enabling training on longer sequences. The algorithm also incorporates recomputation during the backward pass to minimize memory usage, delivering significant improvements in training large models like BERT and GPT-2.
