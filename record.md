# Record of limits, strengths and weaknesses
## Our approach
We decided to split the work in frontend & backend development, using the two LLMs accounts
## Backend
- All development in one single LLM (2) without cleaning context
- It performs well and being consistent prompt by prompt
- Main strategy: ask for general TODO list for the project and then follow it with one prompt for one task
- A bit of confusion in PostgreSQL DB setup, probably not so much knowledge about my machine
- Test for checking the results (a sort of self-correction)
- A bit of weirdness with edge cases
## Frontend