from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="crawl",
    version="1.0.0",
    author="Mahdio0",
    description="A fast, lightweight web scraper for the first 5 minutes of a CTF web challenge.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Mahdio0/CRAWL",
    packages=find_packages(),
    python_requires=">=3.7",
    install_requires=requirements,
    entry_points={
        "console_scripts": [
            "crawl=crawl.main:main",
        ],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Environment :: Console",
        "Topic :: Security",
    ],
)
