import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function CreateIssue() {
  const navigate = useNavigate();

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [category, setCategory] =
    useState("Water");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token =
        localStorage.getItem("token");

      await api.post(
        "/issues",
        {
          title,
          description,
          category,
        },
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      alert("Issue Created");

      navigate("/issues");

    } catch (error) {
      console.error(error);

      alert("Failed to create issue");
    }
  };

  return (
    <div>
      <h1>Raise New Issue</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Issue Title"
          value={title}
          onChange={(e) =>
            setTitle(e.target.value)
          }
          required
        />

        <br />
        <br />

        <textarea
          placeholder="Describe the issue"
          value={description}
          onChange={(e) =>
            setDescription(
              e.target.value
            )
          }
          required
        />

        <br />
        <br />

        <select
          value={category}
          onChange={(e) =>
            setCategory(
              e.target.value
            )
          }
        >
          <option value="Electrical">
            Electrical
          </option>

          <option value="Mess">
            Mess
          </option>

          <option value="Infrastructure">
            Infrastructure
          </option>

          <option value="Cleanliness">
            Cleanliness
          </option>

          <option value="Water">
            Water
          </option>

          <option value="Internet">
            Internet
          </option>

          <option value="Furniture">
            Furniture
          </option>

          <option value="Other">
            Other
          </option>
        </select>

        <br />
        <br />

        <button type="submit">
          Submit Issue
        </button>
      </form>
    </div>
  );
}

export default CreateIssue;