@echo off
REM Đường dẫn mặc định của Git Bash trên Windows
"C:\Program Files\Git\bin\bash.exe" --login -c "git init ; git remote add fishingmathing-dev https://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@github.com/earthhumanandnature/fishingmathing-dev.git && git add . ; git commit -m 'idk' ; git push fishingmathing-dev master --force; exec bash"
pause